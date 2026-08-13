package com.womensafty.app

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import java.util.Locale

class SafetyForegroundService : Service() {

    enum class RecognitionState {
        IDLE,
        STARTING,
        LISTENING,
        PROCESSING,
        RESTARTING,
        STOPPING,
        STOPPED,
        FAILED
    }

    companion object {
        const val TAG = "SafetyForegroundService"
        const val NOTIFICATION_ID = 9901
        const val STARTUP_NOTIFICATION_ID = 9900

        const val CHANNEL_STARTUP_ID = "womensafty_startup_channel_v4"
        const val CHANNEL_STARTUP_NAME = "WomenSafty Safety Alert"

        const val CHANNEL_SILENT_ID = "womensafty_silent_channel_v4"
        const val CHANNEL_SILENT_NAME = "WomenSafty Safety Monitoring (Silent)"

        const val ACTION_START = "com.womensafty.app.action.START_SAFETY_SERVICE"
        const val ACTION_STOP = "com.womensafty.app.action.STOP_SAFETY_SERVICE"
        const val ACTION_UPDATE_LANGUAGE = "com.womensafty.app.action.UPDATE_LANGUAGE"
        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_MESSAGE = "extra_message"
        const val EXTRA_LANGUAGE = "extra_language"

        private const val MAX_CONSECUTIVE_FATAL_ERRORS = 5

        @Volatile
        var isRunning: Boolean = false
            private set

        @Volatile
        var hasPlayedStartupAlert: Boolean = false
            private set

        @Volatile
        var emergencyTriggered: Boolean = false
            private set

        @Volatile
        var currentLanguage: String = "en-US"
            private set

        @Volatile
        var currentState: RecognitionState = RecognitionState.IDLE
            private set

        // Multi-language Emergency Keywords for native safety evaluation
        private val EMERGENCY_KEYWORDS = mapOf(
            "en-US" to listOf(
                "help", "help me", "save me", "emergency", "call police",
                "i am in danger", "someone is following me", "danger"
            ),
            "te-IN" to listOf(
                "సహాయం", "నన్ను కాపాడండి", "కాపాడండి", "ప్రమాదం", "పోలీసులకు కాల్ చేయండి"
            ),
            "hi-IN" to listOf(
                "बचाओ", "मदद", "मदद करो", "पुलिस को बुलाओ", "मैं खतरे में हूँ", "खतरा"
            )
        )
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var speechRecognizer: SpeechRecognizer? = null
    private var audioManager: AudioManager? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var restartRunnable: Runnable? = null
    private var consecutiveFatalErrors: Int = 0
    private var notificationBuilt: Notification? = null

    private var originalMusicVolume: Int = -1
    private var originalSystemVolume: Int = -1
    private var originalNotificationVolume: Int = -1

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "[SafetyForegroundService] onCreate: Initializing background safety service...")
        createNotificationChannels()
        acquireWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START
        Log.i(TAG, "[SafetyForegroundService] onStartCommand: action=$action, flags=$flags, startId=$startId")

        if (action == ACTION_STOP) {
            Log.i(TAG, "[SafetyForegroundService] Service received ACTION_STOP. Tearing down...")
            currentState = RecognitionState.STOPPING
            hasPlayedStartupAlert = false
            emergencyTriggered = false
            stopListening()
            stopService()
            return START_NOT_STICKY
        }

        if (action == ACTION_UPDATE_LANGUAGE) {
            val newLang = intent?.getStringExtra(EXTRA_LANGUAGE) ?: "en-US"
            Log.i(TAG, "[SafetyForegroundService] Updating language to: $newLang")
            currentLanguage = newLang
            if (isRunning) {
                scheduleRestart(100L)
            }
            return START_STICKY
        }

        val title = intent?.getStringExtra(EXTRA_TITLE) ?: "WomenSafty Safety Mode Active"
        val message = intent?.getStringExtra(EXTRA_MESSAGE) ?: "Monitoring live location & emergency voice keywords"
        currentLanguage = intent?.getStringExtra(EXTRA_LANGUAGE) ?: currentLanguage

        // 1. Audit and log all required runtime permissions for Android 14+
        checkAndLogPermissions()

        // 2. Play one-time startup notification alert ONLY ONCE per journey start
        if (!hasPlayedStartupAlert && !isRunning) {
            hasPlayedStartupAlert = true
            emergencyTriggered = false
            try {
                val startupNotification = buildStartupNotification(title, "WomenSafty Safety Mode activated")
                val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                manager.notify(STARTUP_NOTIFICATION_ID, startupNotification)
                Log.i(TAG, "[SafetyForegroundService] STARTUP_ALERT_PLAYED")

                mainHandler.postDelayed({
                    try {
                        manager.cancel(STARTUP_NOTIFICATION_ID)
                    } catch (e: Exception) {
                        Log.d(TAG, "[SafetyForegroundService] Startup notification auto-cancelled.")
                    }
                }, 3000L)
            } catch (e: Exception) {
                Log.w(TAG, "[SafetyForegroundService] Could not show startup notification: ${e.message}")
            }
        }

        // 3. Build the persistent silent foreground notification
        notificationBuilt = buildSilentNotification(title, message)

        // 4. Call startForeground with silent notification and appropriate service types
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                var serviceType = 0
                val hasLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                                  ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                val hasAudio = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

                if (hasLocation) {
                    serviceType = serviceType or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && hasAudio) {
                    serviceType = serviceType or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                }

                if (serviceType != 0) {
                    startForeground(NOTIFICATION_ID, notificationBuilt!!, serviceType)
                } else {
                    startForeground(NOTIFICATION_ID, notificationBuilt!!)
                }
            } else {
                startForeground(NOTIFICATION_ID, notificationBuilt!!)
            }
            isRunning = true
            consecutiveFatalErrors = 0
            Log.i(TAG, "[SafetyForegroundService] SILENT_NOTIFICATION_UPDATE")

            // 5. Initialize and start native continuous SpeechRecognizer
            initAndStartSpeechRecognizer()
        } catch (se: SecurityException) {
            Log.e(TAG, "[SafetyForegroundService] SecurityException calling startForeground: ${se.message}", se)
            isRunning = true
        } catch (e: Exception) {
            Log.e(TAG, "[SafetyForegroundService] Exception calling startForeground: ${e.message}", e)
            isRunning = true
        }

        return START_STICKY
    }

    override fun onDestroy() {
        Log.i(TAG, "[SafetyForegroundService] onDestroy: Service destroyed. Cleaning up speech recognizer & WakeLock.")
        isRunning = false
        emergencyTriggered = false
        currentState = RecognitionState.STOPPED
        stopListening()
        releaseWakeLock()
        super.onDestroy()
    }

    private fun checkAndLogPermissions() {
        val hasRecordAudio = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        val hasFineLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarseLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasWakeLock = ContextCompat.checkSelfPermission(this, Manifest.permission.WAKE_LOCK) == PackageManager.PERMISSION_GRANTED
        val hasNotif = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        Log.i(TAG, "[SafetyForegroundService] Permission Audit: RECORD_AUDIO=$hasRecordAudio, FINE_LOC=$hasFineLocation, COARSE_LOC=$hasCoarseLocation, NOTIFICATIONS=$hasNotif, WAKE_LOCK=$hasWakeLock, SDK_INT=${Build.VERSION.SDK_INT}")
        if (!hasRecordAudio) {
            Log.w(TAG, "[SafetyForegroundService] ⚠️ RECORD_AUDIO permission is NOT granted. Background speech capture will fail.")
        }
        if (!hasNotif && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Log.w(TAG, "[SafetyForegroundService] ⚠️ POST_NOTIFICATIONS permission is NOT granted. Notification might be suppressed by Android OS.")
        }
    }

    // ─── Native SpeechRecognizer Lifecycle ──────────────────────────────────────

    private fun initAndStartSpeechRecognizer() {
        mainHandler.post {
            if (!isRunning) return@post

            if (!SpeechRecognizer.isRecognitionAvailable(this)) {
                Log.e(TAG, "[SafetyForegroundService] SpeechRecognizer.isRecognitionAvailable returned FALSE on this device.")
                currentState = RecognitionState.FAILED
                emitStateToJs("FAILED", "SpeechRecognizer not available on device")
                return@post
            }

            val hasMic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
            if (!hasMic) {
                Log.e(TAG, "[SafetyForegroundService] Cannot initialize SpeechRecognizer: RECORD_AUDIO permission NOT granted.")
                currentState = RecognitionState.FAILED
                emitStateToJs("FAILED", "RECORD_AUDIO permission missing")
                return@post
            }

            cleanDestroyRecognizer()

            try {
                currentState = RecognitionState.STARTING
                Log.i(TAG, "[SafetyForegroundService] Recognizer initialized for locale: $currentLanguage")

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
                speechRecognizer?.setRecognitionListener(createRecognitionListener())

                startListeningSession()
            } catch (e: Exception) {
                Log.e(TAG, "[SafetyForegroundService] Exception initializing SpeechRecognizer: ${e.message}", e)
                handleFatalError("Init exception: ${e.message}")
            }
        }
    }

    private fun muteRecognitionBeep() {
        try {
            if (audioManager == null) {
                audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            }
            audioManager?.let { am ->
                if (originalMusicVolume == -1) {
                    originalMusicVolume = am.getStreamVolume(AudioManager.STREAM_MUSIC)
                    originalSystemVolume = am.getStreamVolume(AudioManager.STREAM_SYSTEM)
                    originalNotificationVolume = am.getStreamVolume(AudioManager.STREAM_NOTIFICATION)
                }

                // Directly silence streams
                am.setStreamVolume(AudioManager.STREAM_MUSIC, 0, 0)
                am.setStreamVolume(AudioManager.STREAM_SYSTEM, 0, 0)
                am.setStreamVolume(AudioManager.STREAM_NOTIFICATION, 0, 0)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_MUTE, 0)
                    am.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_MUTE, 0)
                    am.adjustStreamVolume(AudioManager.STREAM_NOTIFICATION, AudioManager.ADJUST_MUTE, 0)
                }
            }
        } catch (e: Exception) {
            Log.d(TAG, "[SafetyForegroundService] muteRecognitionBeep: ${e.message}")
        }
    }

    private fun unmuteRecognitionBeep() {
        try {
            audioManager?.let { am ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_UNMUTE, 0)
                    am.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_UNMUTE, 0)
                    am.adjustStreamVolume(AudioManager.STREAM_NOTIFICATION, AudioManager.ADJUST_UNMUTE, 0)
                }
                if (originalMusicVolume != -1) {
                    am.setStreamVolume(AudioManager.STREAM_MUSIC, originalMusicVolume, 0)
                }
                if (originalSystemVolume != -1) {
                    am.setStreamVolume(AudioManager.STREAM_SYSTEM, originalSystemVolume, 0)
                }
                if (originalNotificationVolume != -1) {
                    am.setStreamVolume(AudioManager.STREAM_NOTIFICATION, originalNotificationVolume, 0)
                }
                originalMusicVolume = -1
                originalSystemVolume = -1
                originalNotificationVolume = -1
            }
        } catch (e: Exception) {
            Log.d(TAG, "[SafetyForegroundService] unmuteRecognitionBeep: ${e.message}")
        }
    }

    private fun startListeningSession() {
        if (!isRunning || speechRecognizer == null) return

        try {
            Log.i(TAG, "[SafetyForegroundService] SPEECH_RESTART_NO_NOTIFICATION")
            muteRecognitionBeep()

            val recognizerIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, currentLanguage)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, currentLanguage)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 10000L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 10000L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 1500L)
            }

            Log.i(TAG, "[SafetyForegroundService] Listening started in locale: $currentLanguage")
            currentState = RecognitionState.LISTENING
            speechRecognizer?.startListening(recognizerIntent)
        } catch (e: Exception) {
            Log.e(TAG, "[SafetyForegroundService] Exception in startListeningSession: ${e.message}", e)
            handleFatalError("startListening exception: ${e.message}")
        }
    }

    private fun createRecognitionListener(): RecognitionListener {
        return object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                Log.i(TAG, "[SafetyForegroundService] Listening ready (onReadyForSpeech)")
                currentState = RecognitionState.LISTENING
                consecutiveFatalErrors = 0
            }

            override fun onBeginningOfSpeech() {
                Log.d(TAG, "[SafetyForegroundService] Speech beginning detected.")
                currentState = RecognitionState.PROCESSING
            }

            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}

            override fun onEndOfSpeech() {
                Log.d(TAG, "[SafetyForegroundService] Speech segment ended.")
                currentState = RecognitionState.PROCESSING
            }

            override fun onError(errorCode: Int) {
                val errorMsg = getSpeechErrorMessage(errorCode)
                Log.i(TAG, "[SafetyForegroundService] Recognition error: code=$errorCode ($errorMsg)")

                if (!isRunning) return

                when (errorCode) {
                    SpeechRecognizer.ERROR_NO_MATCH,
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
                        consecutiveFatalErrors = 0
                        scheduleRestart(1000L)
                    }
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY,
                    SpeechRecognizer.ERROR_CLIENT -> {
                        scheduleRecreation(1000L)
                    }
                    12, 13 -> {
                        Log.w(TAG, "[SafetyForegroundService] Language [$currentLanguage] unavailable (code=$errorCode). Falling back to system default en-US...")
                        if (currentLanguage != "en-US") {
                            currentLanguage = "en-US"
                            scheduleRecreation(500L)
                        } else {
                            handleFatalError("Language unavailable ($errorCode)")
                        }
                    }
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                        Log.e(TAG, "[SafetyForegroundService] Insufficient microphone permissions.")
                        currentState = RecognitionState.FAILED
                        emitStateToJs("FAILED", "Microphone permission denied")
                    }
                    SpeechRecognizer.ERROR_NETWORK,
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT,
                    SpeechRecognizer.ERROR_SERVER -> {
                        scheduleRestart(2000L)
                    }
                    else -> {
                        handleFatalError("Error code $errorCode ($errorMsg)")
                    }
                }
            }

            override fun onResults(results: Bundle?) {
                consecutiveFatalErrors = 0
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                Log.i(TAG, "[SafetyForegroundService] Speech result received: $matches")

                if (!matches.isNullOrEmpty()) {
                    val primaryTranscript = matches[0]
                    handleTranscript(primaryTranscript, isFinal = true)
                }

                scheduleRestart(500L)
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    val partialTranscript = matches[0]
                    Log.d(TAG, "[SafetyForegroundService] Partial speech result: $partialTranscript")
                    handleTranscript(partialTranscript, isFinal = false)
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        }
    }

    private fun handleTranscript(transcript: String, isFinal: Boolean) {
        val cleanTranscript = transcript.trim()
        if (cleanTranscript.isEmpty()) return

        Log.i(TAG, "[SafetyForegroundService] Recognized transcript: \"$cleanTranscript\" (lang=$currentLanguage, isFinal=$isFinal)")

        try {
            val params = Arguments.createMap().apply {
                putString("transcript", cleanTranscript)
                putBoolean("isFinal", isFinal)
                putString("language", currentLanguage)
            }
            SafetyForegroundModule.sendEvent("onVoiceTranscript", params)
        } catch (e: Exception) {
            Log.e(TAG, "[SafetyForegroundService] Error sending transcript to JS: ${e.message}")
        }

        val matchedKeyword = checkEmergencyKeyword(cleanTranscript, currentLanguage)
        if (matchedKeyword != null && !emergencyTriggered) {
            emergencyTriggered = true
            Log.i(TAG, "[SafetyForegroundService] KEYWORD_NO_NOTIFICATION_SOUND")
            Log.w(TAG, "[SafetyForegroundService] Keyword matched: \"$matchedKeyword\" | Emergency dispatch started (first trigger)")
            try {
                val emergencyParams = Arguments.createMap().apply {
                    putString("keyword", matchedKeyword)
                    putString("transcript", cleanTranscript)
                    putString("language", currentLanguage)
                    putDouble("confidence", 0.95)
                }
                SafetyForegroundModule.sendEvent("onEmergencyKeyword", emergencyParams)
            } catch (e: Exception) {
                Log.e(TAG, "[SafetyForegroundService] Error sending emergency keyword event to JS: ${e.message}")
            }
        }
    }

    private fun checkEmergencyKeyword(text: String, language: String): String? {
        val normalized = text.lowercase(Locale.ROOT).replace(Regex("[.,/#!$%^&*;:{}=\\-_`~()?'\"“„]"), "").trim()
        val keywords = EMERGENCY_KEYWORDS[language] ?: EMERGENCY_KEYWORDS["en-US"] ?: emptyList()

        for (kw in keywords) {
            val normKw = kw.lowercase(Locale.ROOT)
            if (normalized == normKw || normalized.contains(normKw)) {
                return kw
            }
        }
        if (language != "en-US") {
            val enKeywords = EMERGENCY_KEYWORDS["en-US"] ?: emptyList()
            for (kw in enKeywords) {
                val normKw = kw.lowercase(Locale.ROOT)
                if (normalized == normKw || normalized.contains(normKw)) {
                    return kw
                }
            }
        }
        return null
    }

    private fun scheduleRestart(delayMs: Long) {
        if (!isRunning) return
        currentState = RecognitionState.RESTARTING
        muteRecognitionBeep()

        restartRunnable?.let { mainHandler.removeCallbacks(it) }
        restartRunnable = Runnable {
            if (!isRunning) return@Runnable
            muteRecognitionBeep()
            if (speechRecognizer == null) {
                initAndStartSpeechRecognizer()
            } else {
                try {
                    speechRecognizer?.cancel()
                    startListeningSession()
                } catch (e: Exception) {
                    Log.w(TAG, "[SafetyForegroundService] Error restarting session, recreating: ${e.message}")
                    initAndStartSpeechRecognizer()
                }
            }
        }
        mainHandler.postDelayed(restartRunnable!!, delayMs)
    }

    private fun scheduleRecreation(delayMs: Long) {
        if (!isRunning) return
        currentState = RecognitionState.RESTARTING
        muteRecognitionBeep()

        restartRunnable?.let { mainHandler.removeCallbacks(it) }
        restartRunnable = Runnable {
            if (!isRunning) return@Runnable
            muteRecognitionBeep()
            initAndStartSpeechRecognizer()
        }
        mainHandler.postDelayed(restartRunnable!!, delayMs)
    }

    private fun handleFatalError(reason: String) {
        consecutiveFatalErrors++
        Log.w(TAG, "[SafetyForegroundService] Recognition error ($consecutiveFatalErrors/$MAX_CONSECUTIVE_FATAL_ERRORS): $reason")

        if (consecutiveFatalErrors >= MAX_CONSECUTIVE_FATAL_ERRORS) {
            Log.e(TAG, "[SafetyForegroundService] Max consecutive errors reached. Entering FAILED state.")
            currentState = RecognitionState.FAILED
            emitStateToJs("FAILED", reason)
            return
        }

        val backoffMs = (1000L * (1 shl (consecutiveFatalErrors - 1))).coerceAtMost(8000L)
        Log.i(TAG, "[SafetyForegroundService] Scheduling backoff retry in ${backoffMs}ms...")
        scheduleRecreation(backoffMs)
    }

    private fun stopListening() {
        Log.i(TAG, "[SafetyForegroundService] Recognizer stopped")
        restartRunnable?.let { mainHandler.removeCallbacks(it) }
        restartRunnable = null
        cleanDestroyRecognizer()
    }

    private fun cleanDestroyRecognizer() {
        try {
            speechRecognizer?.let {
                it.cancel()
                it.destroy()
            }
        } catch (e: Exception) {
            Log.w(TAG, "[SafetyForegroundService] Error destroying SpeechRecognizer: ${e.message}")
        } finally {
            speechRecognizer = null
            if (currentState != RecognitionState.FAILED) {
                currentState = RecognitionState.IDLE
            }
        }
    }

    private fun emitStateToJs(state: String, message: String? = null) {
        try {
            val params = Arguments.createMap().apply {
                putString("state", state)
                message?.let { putString("message", it) }
            }
            SafetyForegroundModule.sendEvent("onRecognitionStateChange", params)
        } catch (e: Exception) {
            Log.e(TAG, "[SafetyForegroundService] Error emitting state to JS: ${e.message}")
        }
    }

    private fun getSpeechErrorMessage(errorCode: Int): String {
        return when (errorCode) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No speech match (silence)"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "RecognitionService busy"
            SpeechRecognizer.ERROR_SERVER -> "Server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input (timeout)"
            12 -> "Language not supported"
            13 -> "Language unavailable"
            else -> "Unknown error ($errorCode)"
        }
    }

    private fun stopService() {
        Log.i(TAG, "[SafetyForegroundService] Notification removed - Journey ended")
        isRunning = false
        hasPlayedStartupAlert = false
        emergencyTriggered = false
        releaseWakeLock()
        unmuteRecognitionBeep()

        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.cancel(STARTUP_NOTIFICATION_ID)
            manager.cancel(NOTIFICATION_ID)
        } catch (e: Exception) {
            Log.d(TAG, "[SafetyForegroundService] Error cancelling notifications: ${e.message}")
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Purge older channel IDs to ensure zero cached sound/vibration leaks from previous versions
            val oldChannels = listOf(
                "womensafty_startup_channel",
                "womensafty_silent_channel",
                "womensafty_startup_channel_v1",
                "womensafty_silent_channel_v1",
                "womensafty_startup_channel_v2",
                "womensafty_silent_channel_v2",
                "womensafty_startup_channel_v3",
                "womensafty_silent_channel_v3"
            )
            for (oldId in oldChannels) {
                try {
                    manager.deleteNotificationChannel(oldId)
                } catch (e: Exception) {
                    // Ignore deletion failures
                }
            }

            val startupChannel = NotificationChannel(
                CHANNEL_STARTUP_ID,
                CHANNEL_STARTUP_NAME,
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Plays one-time alert tone when WomenSafty Safety Mode starts"
                setShowBadge(false)
                enableVibration(false)
            }
            manager.createNotificationChannel(startupChannel)

            val silentChannel = NotificationChannel(
                CHANNEL_SILENT_ID,
                CHANNEL_SILENT_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Silent ongoing status notification while Safety Mode is active"
                setShowBadge(false)
                setSound(null, null)
                enableVibration(false)
                vibrationPattern = longArrayOf(0)
                enableLights(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(silentChannel)
            Log.i(TAG, "[SafetyForegroundService] Notification channels created (Startup & Silent v4).")
        }
    }

    private fun buildStartupNotification(title: String, message: String): Notification {
        val smallIconRes = android.R.drawable.ic_lock_idle_alarm

        return NotificationCompat.Builder(this, CHANNEL_STARTUP_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(smallIconRes)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
    }

    private fun buildSilentNotification(title: String, message: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingLaunchIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val sosIntent = Intent(this, NotificationActionReceiver::class.java).apply {
            action = NotificationActionReceiver.ACTION_TRIGGER_SOS
        }
        val pendingSosIntent = PendingIntent.getBroadcast(
            this,
            1,
            sosIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val endIntent = Intent(this, NotificationActionReceiver::class.java).apply {
            action = NotificationActionReceiver.ACTION_END_JOURNEY
        }
        val pendingEndIntent = PendingIntent.getBroadcast(
            this,
            2,
            endIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val smallIconRes = android.R.drawable.ic_lock_idle_alarm

        return NotificationCompat.Builder(this, CHANNEL_SILENT_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(smallIconRes)
            .setContentIntent(pendingLaunchIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setSound(null)
            .setVibrate(null)
            .setDefaults(0)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_dialog_alert, "🚨 Trigger SOS", pendingSosIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "End Journey", pendingEndIntent)
            .build()
    }

    fun updatePersistentNotificationSilently(title: String, message: String) {
        if (!isRunning) return
        try {
            val updated = buildSilentNotification(title, message)
            notificationBuilt = updated
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(NOTIFICATION_ID, updated)
            Log.i(TAG, "[SafetyForegroundService] SILENT_NOTIFICATION_UPDATE")
        } catch (e: Exception) {
            Log.w(TAG, "[SafetyForegroundService] Error updating notification: ${e.message}")
        }
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "WomenSafty::SafetyForegroundServiceWakeLock"
            ).apply {
                setReferenceCounted(false)
            }
        }
        try {
            if (wakeLock?.isHeld != true) {
                wakeLock?.acquire(4 * 60 * 60 * 1000L) // 4 hours max timeout safety guard
                Log.i(TAG, "[SafetyForegroundService] Partial WakeLock acquired.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "[SafetyForegroundService] Error acquiring WakeLock: ${e.message}", e)
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                Log.i(TAG, "[SafetyForegroundService] Partial WakeLock released.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "[SafetyForegroundService] Error releasing WakeLock: ${e.message}", e)
        }
    }
}
