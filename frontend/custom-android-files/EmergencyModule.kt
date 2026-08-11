package com.nameisrk.aegiswomensafety

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule

class EmergencyModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        instance = this
    }

    override fun getName(): String {
        return "EmergencyModule"
    }

    @ReactMethod
    fun startForegroundNotification(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, SafetyForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopForegroundNotification(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, SafetyForegroundService::class.java)
            context.stopService(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    fun sendEmergencyAction(action: String) {
        if (reactApplicationContext.hasActiveCatalystInstance()) {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("EmergencyAction", action)
        }
    }

    companion object {
        var instance: EmergencyModule? = null
    }
}
