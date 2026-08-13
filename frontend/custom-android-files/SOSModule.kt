package com.nameisrk.aegiswomensafety

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class SOSModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SOSModule"
    }

    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(reactApplicationContext, permission) ==
            PackageManager.PERMISSION_GRANTED
    }

    /**
     * Sends [message] to every number in [numbers] via SmsManager — no UI, no chooser.
     * Resolves true only if every send call completed without throwing.
     */
    @ReactMethod
    fun sendSilentSms(numbers: ReadableArray, message: String, promise: Promise) {
        if (!hasPermission(Manifest.permission.SEND_SMS)) {
            promise.reject("PERMISSION_DENIED", "SEND_SMS permission not granted")
            return
        }
        try {
            var smsManager: SmsManager? = null
            try {
                smsManager = reactApplicationContext.getSystemService(SmsManager::class.java)
            } catch (_: Exception) {
            }
            if (smsManager == null) {
                @Suppress("DEPRECATION")
                smsManager = SmsManager.getDefault()
            }

            var sentCount = 0
            for (i in 0 until numbers.size()) {
                val rawNumber = numbers.getString(i)?.trim()
                if (rawNumber.isNullOrBlank()) continue
                try {
                    val parts = smsManager.divideMessage(message)
                    if (parts != null && parts.size > 1) {
                        smsManager.sendMultipartTextMessage(rawNumber, null, parts, null, null)
                    } else {
                        smsManager.sendTextMessage(rawNumber, null, message, null, null)
                    }
                    sentCount++
                } catch (e: Exception) {
                    android.util.Log.e("SOSModule", "Error sending SMS to $rawNumber: ${e.message}")
                }
            }
            if (sentCount > 0) {
                promise.resolve(true)
            } else {
                promise.reject("SMS_FAILED", "Could not send SMS to any recipient")
            }
        } catch (e: Exception) {
            promise.reject("SMS_ERROR", e.message, e)
        }
    }

    /**
     * Places a call via Intent.ACTION_CALL — starts immediately, no dialer confirmation UI.
     * Requires CALL_PHONE (dangerous permission, must already be granted at the JS layer).
     */
    @ReactMethod
    fun makeSilentCall(phoneNumber: String, promise: Promise) {
        if (!hasPermission(Manifest.permission.CALL_PHONE)) {
            promise.reject("PERMISSION_DENIED", "CALL_PHONE permission not granted")
            return
        }
        try {
            val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$phoneNumber")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CALL_ERROR", e.message, e)
        }
    }
}
