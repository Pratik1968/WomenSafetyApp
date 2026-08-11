import { LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootStack } from "./src/navigation/RootStack";
import {
  AuthProvider,
  EmergencyProvider,
  VoiceProvider,
  AIProvider,
  JourneyProvider,
} from "./src/context";

// Suppress on-screen developer warning/error toast overlays in demo/user UI
LogBox.ignoreAllLogs(true);

export default function App() {
  return (
    <SafeAreaProvider testID="app-root">
      <AuthProvider>
        <VoiceProvider>
          <EmergencyProvider>
            {/*
              JourneyProvider is inside VoiceProvider (consumes voice transcripts)
              and beside EmergencyProvider (both are independent safety-mode services).
              It has NO dependency on AIProvider.
            */}
            <JourneyProvider>
              <AIProvider>
                <RootStack />
              </AIProvider>
            </JourneyProvider>
          </EmergencyProvider>
        </VoiceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
