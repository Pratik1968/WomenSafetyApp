import { useEffect, useRef, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack";

import { SplashScreen } from "../screens/SplashScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { PhoneScreen } from "../screens/PhoneScreen";
import { OtpScreen } from "../screens/OtpScreen";
import { OnboardingScreen, ONBOARDING_STEPS } from "../screens/OnboardingScreen";
import {
  SetupNameScreen,
  SetupGenderScreen,
  SetupBloodScreen,
  SetupDobScreen,
  SetupContactsScreen,
  SetupMedicalScreen,
  SetupCompleteScreen,
} from "../screens/SetupScreens";
import { PermissionScreen, PERMISSIONS } from "../screens/PermissionScreens";
import { HomeScreen } from "../screens/HomeScreen";
import { SafetyScreen } from "../screens/SafetyScreen";
import { SafetyModeScreen } from "../screens/SafetyModeScreens";
import { HistoryScreen, IncidentDetailScreen } from "../screens/HistoryScreens";
import { ProfileScreen, SettingsScreen, DataPrivacyScreen } from "../screens/ProfileScreens";
import { SosScreen, type SosState } from "../screens/SosScreen";
import { SafeRouteScreen } from "../screens/SafeRouteScreen";
import { NearbyHelpScreen } from "../screens/NearbyHelpScreen";
import { AssistantScreen } from "../screens/AssistantScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { HomeStubScreen } from "../screens/HomeStubScreen";
import { VoiceTriggerConfigScreen } from "../modules/voice/screens/VoiceTriggerConfigScreen";
import { VoiceTrainingScreen } from "../modules/voice/screens/VoiceTrainingScreen";
import { type TabKey } from "../components/app/BottomNav";
import { saveProfile } from "../services/profileService";

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Welcome: undefined;
  Phone: undefined;
  Otp: { phone: string; confirmation: any } | undefined;
  Setup: undefined;
  Permissions: undefined;
  Home: undefined;
  Safety: undefined;
  SafetyMode: undefined;
  History: undefined;
  Profile: undefined;
  Sos: { state?: SosState } | undefined;
  SafeRoute: undefined;
  NearbyHelp: undefined;
  Assistant: undefined;
  Report: undefined;
  Notifications: undefined;
  Settings: undefined;
  DataPrivacy: undefined;
  IncidentDetail: undefined;
  HomeStub: undefined;
  VoiceTriggerConfig: undefined;
  VoiceTraining: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function SplashRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Splash">) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace("Onboarding"), 2600);
    return () => clearTimeout(t);
  }, [navigation]);
  return <SplashScreen />;
}

function OnboardingRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Onboarding">) {
  const [step, setStep] = useState(0);
  const isLast = step === ONBOARDING_STEPS.length - 1;
  return (
    <OnboardingScreen
      step={step}
      onSkip={() => navigation.replace("Welcome")}
      onNext={() => (isLast ? navigation.replace("Welcome") : setStep(step + 1))}
    />
  );
}

function WelcomeRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Welcome">) {
  return (
    <WelcomeScreen
      onContinue={() => navigation.navigate("Phone")}
      onSkipTest={() => navigation.replace("Home")}
    />
  );
}

function PhoneRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Phone">) {
  return (
    <PhoneScreen
      onBack={() => navigation.goBack()}
      onContinue={(phone, confirmation) => navigation.navigate("Otp", { phone, confirmation })}
    />
  );
}

function OtpRouteScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Otp">) {
  const phone = route.params?.phone;
  const confirmation = route.params?.confirmation;

  return (
    <OtpScreen
      phone={phone}
      confirmation={confirmation}
      onBack={() => navigation.goBack()}
      onVerified={(hasProfile) => {
        if (hasProfile) {
          navigation.replace("Home");
        } else {
          navigation.replace("Setup");
        }
      }}
    />
  );
}

const SETUP_ORDER = ["Name", "Gender", "Blood", "Birthday", "Contacts", "Medical", "Done"] as const;
type SetupStep = (typeof SETUP_ORDER)[number];

function SetupRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Setup">) {
  const [step, setStep] = useState<SetupStep>("Name");
  const [saving, setSaving] = useState(false);

  const profileData = useRef<{
    full_name?: string;
    gender?: string;
    blood_group?: string;
    date_of_birth?: string;
  }>({});

  const go = (s: SetupStep) => setStep(s);
  const back = () => go(SETUP_ORDER[Math.max(SETUP_ORDER.indexOf(step) - 1, 0)]);

  const handleSaveAndComplete = async () => {
    setSaving(true);
    try {
      await saveProfile(profileData.current);
    } catch (err) {
      console.warn("Could not save profile to Supabase:", err);
    } finally {
      setSaving(false);
      navigation.replace("Permissions");
    }
  };

  if (step === "Name")
    return (
      <SetupNameScreen
        onBack={back}
        onNext={(name) => {
          profileData.current.full_name = name;
          go("Gender");
        }}
      />
    );
  if (step === "Gender")
    return (
      <SetupGenderScreen
        onBack={back}
        onNext={(gender) => {
          profileData.current.gender = gender;
          go("Blood");
        }}
      />
    );
  if (step === "Blood")
    return (
      <SetupBloodScreen
        onBack={back}
        onNext={(blood) => {
          profileData.current.blood_group = blood;
          go("Birthday");
        }}
      />
    );
  if (step === "Birthday")
    return (
      <SetupDobScreen
        onBack={back}
        onNext={(dob) => {
          profileData.current.date_of_birth = dob;
          go("Contacts");
        }}
      />
    );
  if (step === "Contacts") return <SetupContactsScreen onBack={back} onNext={() => go("Medical")} onSkip={() => go("Medical")} />;
  if (step === "Medical") return <SetupMedicalScreen onBack={back} onNext={() => go("Done")} onSkip={() => go("Done")} />;
  return <SetupCompleteScreen onDone={handleSaveAndComplete} />;
}

function PermissionsRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Permissions">) {
  const [index, setIndex] = useState(0);
  const skipToHome = () => navigation.replace("Home");
  const next = () => {
    if (index >= PERMISSIONS.length - 1) {
      navigation.replace("Home");
      return;
    }
    setIndex((i) => i + 1);
  };
  return <PermissionScreen key={index} index={index} onAllow={next} onSkip={skipToHome} />;
}

function HomeRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Home">) {
  return (
    <HomeScreen
      onSos={() => navigation.navigate("Sos", { state: "active" })}
      onNotifications={() => navigation.navigate("Notifications")}
      onSafetyMode={() => navigation.navigate("SafetyMode")}
      onAssistant={() => navigation.navigate("Assistant")}
      onQuickAction={(action: string) => {
        if (action === "Safe Route") navigation.navigate("SafeRoute");
        else if (action === "Nearby Police" || action === "Hospitals") navigation.navigate("NearbyHelp");
        else if (action === "AI Assistant") navigation.navigate("Assistant");
        else if (action === "Report Area") navigation.navigate("Report");
        else if (action === "Contacts") navigation.navigate("Profile");
      }}
      onTab={(t: TabKey) => {
        if (t === "safety") navigation.navigate("Safety");
        else if (t === "history") navigation.navigate("History");
        else if (t === "profile") navigation.navigate("Profile");
      }}
    />
  );
}

function SafetyRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Safety">) {
  return (
    <SafetyScreen
      onTab={(t: TabKey) => {
        if (t === "home") navigation.navigate("Home");
        else if (t === "history") navigation.navigate("History");
        else if (t === "profile") navigation.navigate("Profile");
      }}
      onSafetyMode={() => navigation.navigate("SafetyMode")}
      onSafeRoute={() => navigation.navigate("SafeRoute")}
      onNearby={() => navigation.navigate("NearbyHelp")}
      onContacts={() => navigation.navigate("Profile")}
      onAssistant={() => navigation.navigate("Assistant")}
      onSos={() => navigation.navigate("Sos", { state: "active" })}
    />
  );
}

function SafetyModeRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "SafetyMode">) {
  return (
    <SafetyModeScreen
      onDone={() => navigation.navigate("Home")}
      onSos={() => navigation.navigate("Sos", { state: "active" })}
    />
  );
}

function HistoryRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "History">) {
  return (
    <HistoryScreen
      onTab={(t: TabKey) => {
        if (t === "home") navigation.navigate("Home");
        else if (t === "safety") navigation.navigate("Safety");
        else if (t === "profile") navigation.navigate("Profile");
      }}
      onOpen={() => navigation.navigate("IncidentDetail")}
      onAssistant={() => navigation.navigate("Assistant")}
      onSos={() => navigation.navigate("Sos", { state: "active" })}
    />
  );
}

function ProfileRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Profile">) {
  return (
    <ProfileScreen
      onTab={(t: TabKey) => {
        if (t === "home") navigation.navigate("Home");
        else if (t === "safety") navigation.navigate("Safety");
        else if (t === "history") navigation.navigate("History");
      }}
      onSettings={() => navigation.navigate("Settings")}
      onPrivacy={() => navigation.navigate("DataPrivacy")}
      onAssistant={() => navigation.navigate("Assistant")}
      onSos={() => navigation.navigate("Sos", { state: "active" })}
    />
  );
}

function SosRouteScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Sos">) {
  const sosState = route.params?.state ?? "active";
  return (
    <SosScreen
      state={sosState}
      onEnd={() => navigation.setParams({ state: "confirm" })}
      onCancelConfirm={() => navigation.setParams({ state: "cancelled" })}
      onDone={() => navigation.replace("Home")}
    />
  );
}

export function RootStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashRouteScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingRouteScreen} />
        <Stack.Screen name="Welcome" component={WelcomeRouteScreen} />
        <Stack.Screen name="Phone" component={PhoneRouteScreen} />
        <Stack.Screen name="Otp" component={OtpRouteScreen} />
        <Stack.Screen name="Setup" component={SetupRouteScreen} />
        <Stack.Screen name="Permissions" component={PermissionsRouteScreen} />
        <Stack.Screen name="Home" component={HomeRouteScreen} />
        <Stack.Screen name="Safety" component={SafetyRouteScreen} />
        <Stack.Screen name="SafetyMode" component={SafetyModeRouteScreen} />
        <Stack.Screen name="History" component={HistoryRouteScreen} />
        <Stack.Screen name="Profile" component={ProfileRouteScreen} />
        <Stack.Screen name="Sos" component={SosRouteScreen} />
        <Stack.Screen name="SafeRoute" component={SafeRouteScreen} />
        <Stack.Screen name="NearbyHelp" component={NearbyHelpScreen} />
        <Stack.Screen name="Assistant" component={AssistantScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="DataPrivacy" component={DataPrivacyScreen} />
        <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} />
        <Stack.Screen name="HomeStub" component={HomeStubScreen} />
        <Stack.Screen name="VoiceTriggerConfig" component={VoiceTriggerConfigScreen} />
        <Stack.Screen name="VoiceTraining" component={VoiceTrainingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
