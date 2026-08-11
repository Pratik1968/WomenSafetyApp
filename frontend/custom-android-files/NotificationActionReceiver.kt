package com.womensafty.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class NotificationActionReceiver : BroadcastReceiver() {

    companion object {
        const val TAG = "NotificationActionReceiver"
        const val ACTION_TRIGGER_SOS = "com.womensafty.app.action.NOTIFICATION_TRIGGER_SOS"
        const val ACTION_END_JOURNEY = "com.womensafty.app.action.NOTIFICATION_END_JOURNEY"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "Received notification action broadcast: $action")

        when (action) {
            ACTION_TRIGGER_SOS -> {
                Log.d(TAG, "User clicked SOS from notification.")
                SafetyForegroundModule.sendEvent("onNotificationAction", "TRIGGER_SOS")

                // Bring app to foreground if not already active
                val launchIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    putExtra("emergency_source", "NOTIFICATION_ACTION")
                }
                context.startActivity(launchIntent)
            }
            ACTION_END_JOURNEY -> {
                Log.d(TAG, "User clicked End Journey from notification.")
                SafetyForegroundModule.sendEvent("onNotificationAction", "END_JOURNEY")

                // Stop the foreground service
                val stopIntent = Intent(context, SafetyForegroundService::class.java).apply {
                    this.action = SafetyForegroundService.ACTION_STOP
                }
                context.startService(stopIntent)
            }
        }
    }
}
