package com.nameisrk.aegiswomensafety

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class SafetyForegroundService : Service() {

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()

        val notification = buildNotification()

        startForeground(1001, notification)

        return START_STICKY
    }

    private fun buildNotification(): Notification {
        // Pending intents for actions
        val fakeCallIntent = Intent(this, NotificationActionReceiver::class.java).apply { action = "ACTION_FAKE_CALL" }
        val sosIntent = Intent(this, NotificationActionReceiver::class.java).apply { action = "ACTION_SOS" }
        val liveLocationIntent = Intent(this, NotificationActionReceiver::class.java).apply { action = "ACTION_LIVE_LOCATION" }

        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

        val fakeCallPendingIntent = PendingIntent.getBroadcast(this, 0, fakeCallIntent, pendingFlags)
        val sosPendingIntent = PendingIntent.getBroadcast(this, 1, sosIntent, pendingFlags)
        val liveLocationPendingIntent = PendingIntent.getBroadcast(this, 2, liveLocationIntent, pendingFlags)

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val launchPendingIntent = launchIntent?.let {
            PendingIntent.getActivity(this, 0, it, pendingFlags)
        }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("\uD83D\uDEE1 Women Safety Active")
            .setContentText("Safety Mode is ON\nTap to access emergency tools")
            .setSmallIcon(resources.getIdentifier("ic_launcher_foreground", "drawable", packageName))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .setContentIntent(launchPendingIntent)
            .addAction(0, "\uD83D\uDCDE Fake Call", fakeCallPendingIntent)
            .addAction(0, "\uD83D\uDEA8 SOS", sosPendingIntent)
            .addAction(0, "\uD83D\uDCCD Live Location", liveLocationPendingIntent)
            .setStyle(NotificationCompat.BigTextStyle().bigText("Safety Mode is ON\nTap to access emergency tools"))

        return builder.build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Women Safety Foreground Service",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Persistent notification for Women Safety mode"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(serviceChannel)
        }
    }

    companion object {
        const val CHANNEL_ID = "SafetyForegroundServiceChannel"
    }
}
