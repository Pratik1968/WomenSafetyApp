package com.nameisrk.aegiswomensafety;

import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.service.quicksettings.TileService;
import android.util.Log;

public class FakeCallTileService extends TileService {
    @Override
    public void onClick() {
        super.onClick();
        Log.d("FakeCallTile", "Tile clicked, launching intent...");
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("aegis://fakecall"));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        if (Build.VERSION.SDK_INT >= 34) {
            PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            startActivityAndCollapse(pendingIntent);
        } else {
            startActivityAndCollapse(intent);
        }
    }
}
