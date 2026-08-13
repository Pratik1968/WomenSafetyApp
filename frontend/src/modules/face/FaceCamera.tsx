import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

interface FaceCameraProps {
  onCapture: (imageUri: string) => Promise<void>;
  busy?: boolean;
}

export function FaceCamera({
  onCapture,
  busy = false,
}: FaceCameraProps) {
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const [error, setError] = useState<string | null>(null);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>
          Camera permission required
        </Text>

        <Text
          style={styles.button}
          onPress={requestPermission}
        >
          Allow Camera
        </Text>
      </View>
    );
  }

  const capture = async () => {
    if (!cameraRef.current || busy) {
      return;
    }

    try {
      setError(null);

      const photo =
        await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
        });

      if (!photo?.uri) {
        throw new Error("Camera did not return an image");
      }

      await onCapture(photo.uri);
    } catch (err) {
      console.error("[FaceCamera]", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to capture face",
      );
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
      />

      <View style={styles.overlay}>
        <View style={styles.faceGuide} />

        <Text style={styles.instruction}>
          Position your face inside the frame
        </Text>

        {error && (
          <Text style={styles.error}>
            {error}
          </Text>
        )}

        <Text
          style={[
            styles.capture,
            busy && styles.disabled,
          ]}
          onPress={capture}
        >
          {busy ? "PROCESSING..." : "CAPTURE"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },

  button: {
    fontSize: 16,
    fontWeight: "700",
    padding: 16,
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 40,
  },

  faceGuide: {
    position: "absolute",
    top: "20%",
    width: 250,
    height: 320,
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 150,
  },

  instruction: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },

  error: {
    color: "#ff7777",
    backgroundColor: "#0009",
    padding: 8,
    marginBottom: 10,
  },

  capture: {
    backgroundColor: "#fff",
    color: "#000",
    fontWeight: "800",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
  },

  disabled: {
    opacity: 0.5,
  },
});