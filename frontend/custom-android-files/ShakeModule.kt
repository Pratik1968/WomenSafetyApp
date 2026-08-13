package com.nameisrk.aegiswomensafety

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.sqrt

class ShakeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

    override fun getName(): String {
        return "ShakeModule"
    }

    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private var listening = false

    private var lastShakeTime = 0L
    private var shakeCount = 0
    private var lastShakeWindowStart = 0L

    companion object {
        private const val SHAKE_THRESHOLD_G = 2.7
        private const val SHAKES_REQUIRED = 3
        private const val SHAKE_WINDOW_MS = 1500L
        private const val MIN_INTERVAL_BETWEEN_SHAKES_MS = 100L
    }

    @ReactMethod
    fun startShakeDetection(promise: Promise) {
        try {
            if (!listening) {
                sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
                accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
                if (accelerometer == null) {
                    promise.reject("NO_SENSOR", "Accelerometer not available on this device")
                    return
                }
                sensorManager?.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME)
                listening = true
                shakeCount = 0
                lastShakeWindowStart = 0L
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHAKE_START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopShakeDetection(promise: Promise) {
        try {
            if (listening) {
                sensorManager?.unregisterListener(this)
                listening = false
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHAKE_STOP_ERROR", e.message, e)
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null || event.sensor.type != Sensor.TYPE_ACCELEROMETER) return

        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        val gX = x / SensorManager.GRAVITY_EARTH
        val gY = y / SensorManager.GRAVITY_EARTH
        val gZ = z / SensorManager.GRAVITY_EARTH
        val gForce = sqrt((gX * gX + gY * gY + gZ * gZ).toDouble())

        val now = System.currentTimeMillis()

        if (gForce > SHAKE_THRESHOLD_G) {
            if (now - lastShakeTime < MIN_INTERVAL_BETWEEN_SHAKES_MS) return
            lastShakeTime = now

            if (now - lastShakeWindowStart > SHAKE_WINDOW_MS) {
                lastShakeWindowStart = now
                shakeCount = 1
            } else {
                shakeCount++
            }

            if (shakeCount >= SHAKES_REQUIRED) {
                shakeCount = 0
                lastShakeWindowStart = 0L
                emitShakeTriggered()
            }
        }
    }

    private fun emitShakeTriggered() {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onShakeTriggered", null)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // No-op — accuracy changes don't affect shake detection.
    }
}
