package com.nameisrk.aegiswomensafety

import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.util.Log
import androidx.annotation.RequiresApi

@RequiresApi(Build.VERSION_CODES.N)
class SafetyTileService : TileService() {
    override fun onStartListening() {
        super.onStartListening()
        val tile = qsTile ?: return
        tile.state = Tile.STATE_ACTIVE
        tile.label = "Women Safety"
        tile.updateTile()
    }

    override fun onClick() {
        super.onClick()
        Log.d("SafetyTileService", "Tile clicked")
        


        val emergencyModule = EmergencyModule.instance
        if (emergencyModule != null) {
            emergencyModule.sendEmergencyAction("FAKE_CALL")
        }

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        if (launchIntent != null) {
            launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            
            if (Build.VERSION.SDK_INT >= 34) {
                val pendingIntent = android.app.PendingIntent.getActivity(
                    this, 
                    0, 
                    launchIntent, 
                    android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
                )
                startActivityAndCollapse(pendingIntent)
            } else {
                @Suppress("DEPRECATION")
                startActivityAndCollapse(launchIntent)
            }
        }
    }
}
