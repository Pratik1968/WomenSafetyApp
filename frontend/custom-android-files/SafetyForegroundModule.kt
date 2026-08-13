package com.nameisrk.aegiswomensafety

import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class SafetyForegroundModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "SafetyForegroundModule"
        const val MODULE_NAME = "SafetyForegroundModule"

        private var reactAppContext: ReactApplicationContext? = null

        fun sendEvent(eventName: String, params: Any?) {
            try {
                if (eventName == "onEmergencyKeyword") {
                    Log.w(TAG, "[SafetyForegroundModule] Emitting emergency event: $eventName | params=$params")
                } else {
                    Log.d(TAG, "[SafetyForegroundModule] sendEvent: $eventName")
                }
                reactAppContext?.let { context ->
                    if (context.hasActiveReactInstance()) {
                        context
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            ?.emit(eventName, params)
                    } else {
                        Log.w(TAG, "[SafetyForegroundModule] ReactContext has no active instance to emit $eventName immediately.")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "[SafetyForegroundModule] Failed to emit event $eventName: ${e.message}", e)
            }
        }
    }

    init {
        reactAppContext = reactContext
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun startSafetyService(title: String?, message: String?, language: String?, promise: Promise) {
        try {
            val targetLang = language ?: "en-US"
            Log.i(TAG, "[SafetyForegroundModule] startSafetyService called with language: $targetLang, title: $title, message: $message")
            val intent = Intent(reactContext, SafetyForegroundService::class.java).apply {
                action = SafetyForegroundService.ACTION_START
                putExtra(SafetyForegroundService.EXTRA_TITLE, title ?: "WomenSafty Safety Mode Active")
                putExtra(SafetyForegroundService.EXTRA_MESSAGE, message ?: "Monitoring live location & emergency voice keywords")
                putExtra(SafetyForegroundService.EXTRA_LANGUAGE, targetLang)
            }

            ContextCompat.startForegroundService(reactContext, intent)
            Log.i(TAG, "[SafetyForegroundModule] ContextCompat.startForegroundService invoked successfully.")
            promise.resolve(true)
        } catch (se: SecurityException) {
            Log.e(TAG, "[SafetyForegroundModule] SecurityException in startSafetyService: ${se.message}", se)
            promise.reject("SECURITY_EXCEPTION", se.message, se)
        } catch (e: Exception) {
            Log.e(TAG, "[SafetyForegroundModule] Exception in startSafetyService: ${e.message}", e)
            promise.reject("START_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateLanguage(language: String, promise: Promise) {
        try {
            Log.i(TAG, "[SafetyForegroundModule] Updating SafetyForegroundService language to [$language]...")
            val intent = Intent(reactContext, SafetyForegroundService::class.java).apply {
                action = SafetyForegroundService.ACTION_UPDATE_LANGUAGE
                putExtra(SafetyForegroundService.EXTRA_LANGUAGE, language)
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "[SafetyForegroundModule] Error updating language: ${e.message}", e)
            promise.reject("UPDATE_LANGUAGE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopSafetyService(promise: Promise) {
        try {
            Log.i(TAG, "[SafetyForegroundModule] Stopping SafetyForegroundService...")
            val intent = Intent(reactContext, SafetyForegroundService::class.java).apply {
                action = SafetyForegroundService.ACTION_STOP
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "[SafetyForegroundModule] Error stopping SafetyForegroundService: ${e.message}", e)
            promise.reject("STOP_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(SafetyForegroundService.isRunning)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Keep for RN NativeEventEmitter compatibility
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep for RN NativeEventEmitter compatibility
    }
}
