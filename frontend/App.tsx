import { LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootStack } from "./src/navigation/RootStack";
import { AuthProvider } from "./src/context/AuthContext";
import { VoiceProvider } from "./src/context/VoiceContext";
import { EmergencyProvider } from "./src/context/EmergencyContext";
import { JourneyProvider } from "./src/context/JourneyContext";
import { AIProvider } from "./src/context/AIContext";

// Suppress on-screen developer warning/error toast overlays in demo/user UI
LogBox.ignoreAllLogs(true);

export default function App() {
  return (
    <SafeAreaProvider testID="app-root">
      <AuthProvider>
        <VoiceProvider>
          <EmergencyProvider>
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
