package com.nameisrk.aegiswomensafety

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d("NotificationReceiver", "Received action: $action")
        
        val emergencyModule = EmergencyModule.instance
        if (emergencyModule != null) {
            when (action) {
                "ACTION_FAKE_CALL" -> emergencyModule.sendEmergencyAction("FAKE_CALL")
                "ACTION_SOS" -> emergencyModule.sendEmergencyAction("SOS")
                "ACTION_LIVE_LOCATION" -> emergencyModule.sendEmergencyAction("LIVE_LOCATION")
            }
        }

        // Launch app intent to ensure it comes to foreground
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            context.startActivity(launchIntent)
        }
    }
}
