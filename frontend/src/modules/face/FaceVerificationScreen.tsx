import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FaceCamera } from "./FaceCamera";
import { faceRepository } from "./faceRepository";

export function FaceVerificationScreen({
  onVerified,
  onFailed,
}: {
  onVerified?: () => void;
  onFailed?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const verify = async (imageUri: string) => {
    if (busy) return;

    setBusy(true);

    try {
      const result = await faceRepository.verifyFace(imageUri);

      console.log("[FaceVerification] result:", result);

      if (result.verified) {
        const person = result.match?.name
          ? ` ${result.match.name}`
          : "";

        Alert.alert(
          "Identity Verified",
          `Face verification successful.${person}`,
          [
            {
              text: "Continue",
              onPress: onVerified,
            },
          ],
        );

        return;
      }

      Alert.alert(
        "Verification Failed",
        result.message ??
          "The captured face does not match a registered trusted face.",
      );
    } catch (error: any) {
      console.error("[FaceVerification]", error);

      const message = error?.message;

      if (message === "No face detected in the uploaded image.") {
        Alert.alert(
          "No Face Detected",
          "Please position your face clearly in front of the camera and try again.",
          [
            {
              text: "OK",
            },
          ],
        );

        return;
      }

      Alert.alert(
        "Verification Error",
        message || "Unable to verify the face. Please try again.",
        [
          {
            text: "OK",
          },
        ],
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <FaceCamera
        onCapture={verify}
        busy={busy}
      />

      <View style={styles.header}>
        <Text style={styles.title}>
          Verify Trusted Person
        </Text>

        <Text style={styles.subtitle}>
          Look directly at the camera to verify your identity.
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

  header: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },

  subtitle: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});