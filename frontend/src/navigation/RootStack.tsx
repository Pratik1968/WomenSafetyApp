import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack";

import { SplashScreen } from "../screens/SplashScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { PhoneScreen } from "../screens/PhoneScreen";
import { OtpScreen } from "../screens/OtpScreen";
import { LoginScreen } from "../screens/LoginScreen";
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
import { HistoryScreen, IncidentDetailScreen } from "../screens/HistoryScreens";
import { ProfileScreen, SettingsScreen, DataPrivacyScreen, ManageContactsScreen } from "../screens/ProfileScreens";
import { SosScreen, type SosState } from "../screens/SosScreen";
import { SafeRouteScreen } from "../screens/SafeRouteScreen";
import { NearbyHelpScreen } from "../screens/NearbyHelpScreen";
import { AssistantScreen } from "../screens/AssistantScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { HomeStubScreen } from "../screens/HomeStubScreen";
import { type TabKey } from "../components/app/BottomNav";
import { saveProfile, clearCurrentProfile } from "../services/profileService";
import { contactStorageService } from "../services/contactStorageService";
import { API_BASE_URL } from "../api/config";
import { getAuthHeader, setPhoneConfirmation, getPhoneConfirmation } from "../services/firebaseConfig";

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Welcome: undefined;
  Phone: undefined;
  Otp: { phone: string } | undefined;
  Login: undefined;
  Setup: undefined;
  Permissions: undefined;
  Home: undefined;
  Safety: undefined;
  History: undefined;
  Profile: undefined;
  Sos: { state?: SosState } | undefined;
  SafeRoute: undefined;
  NearbyHelp: undefined;
  Assistant: undefined;
  Report: undefined;
  CommunityReports: undefined;
  Notifications: undefined;
  HomeStub: undefined;
  NewIncident: undefined;
  IncidentDetail: { id?: string } | undefined;
  UploadEvidence: { incidentId?: string } | undefined;
  EvidenceDetail: { id?: string } | undefined;
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminIncidents: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
type P<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

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
      onSecureLogin={() => navigation.navigate("Login")}
    />
  );
}

function LoginRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Login">) {
  return (
    <LoginScreen
      onBack={() => navigation.goBack()}
      onLoggedIn={() => navigation.replace("Home")}
      onUsePhoneOtp={() => navigation.replace("Phone")}
    />
  );
}

function PhoneRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Phone">) {
  return (
    <PhoneScreen
      onBack={() => navigation.goBack()}
      onContinue={(phone, confirmation) => {
        clearCurrentProfile();
        setPhoneConfirmation(confirmation);
        navigation.navigate("Otp", { phone });
      }}
    />
  );
}

function OtpRouteScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Otp">) {
  const phone = route.params?.phone;
  const confirmation = getPhoneConfirmation();

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

  // Accumulate profile data as user moves through steps
  const profileData = useRef<{
    full_name?: string;
    gender?: string;
    blood_group?: string;
    date_of_birth?: string;
    medical_notes?: string;
  }>({});

  const go = (s: SetupStep) => setStep(s);
  const back = () => go(SETUP_ORDER[Math.max(SETUP_ORDER.indexOf(step) - 1, 0)]);

  const advanceTo = (nextStep: SetupStep) => go(nextStep);

  const handleSaveAndComplete = async () => {
    setSaving(true);
    try {
      const savedProfile = await saveProfile(profileData.current);
      const userId = savedProfile?.id;

      if (userId) {
        // Sync local emergency contacts added during setup step 5 to Supabase
        const storedContacts = await contactStorageService.getStoredEmergencyContacts();
        if (storedContacts && storedContacts.length > 0) {
          const authHeader = await getAuthHeader();
          for (let i = 0; i < storedContacts.length; i++) {
            const contact = storedContacts[i];
            try {
              await fetch(`${API_BASE_URL}/emergency/contacts`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeader },
                body: JSON.stringify({
                  user_id: userId,
                  name: contact.name,
                  phone: contact.phone,
                  relationship: contact.relation || "FRIEND",
                  priority: contact.priority ?? i + 1,
                }),
              });
            } catch (cErr) {
              console.warn("Failed to sync onboarding contact to backend:", cErr);
            }
          }
        }
      }

      setSaving(false);
      navigation.replace("Permissions");
    } catch (err: any) {
      setSaving(false);
      console.warn("Could not save profile to Supabase:", err);
      Alert.alert(
        "Couldn't save your profile",
        "We weren't able to reach the server to save your safety profile. Check your connection and try again.",
        [
          { text: "Continue anyway", style: "destructive", onPress: () => navigation.replace("Permissions") },
          { text: "Retry", onPress: handleSaveAndComplete },
        ]
      );
    }
  };

  if (step === "Name")
    return (
      <SetupNameScreen
        onBack={back}
        onNext={(name) => {
          profileData.current.full_name = name;
          advanceTo("Gender");
        }}
      />
    );
  if (step === "Gender")
    return (
      <SetupGenderScreen
        onBack={back}
        onNext={(gender) => {
          profileData.current.gender = gender;
          advanceTo("Blood");
        }}
      />
    );
  if (step === "Blood")
    return (
      <SetupBloodScreen
        onBack={back}
        onNext={(blood) => {
          profileData.current.blood_group = blood;
          advanceTo("Birthday");
        }}
      />
    );
  if (step === "Birthday")
    return (
      <SetupDobScreen
        onBack={back}
        onNext={(dob) => {
          profileData.current.date_of_birth = dob;
          advanceTo("Contacts");
        }}
      />
    );
  if (step === "Contacts") return <SetupContactsScreen onBack={back} onNext={() => advanceTo("Medical")} onSkip={() => advanceTo("Medical")} />;
  if (step === "Medical")
    return (
      <SetupMedicalScreen
        onBack={back}
        onNext={(info) => {
          const parts: string[] = [];
          if (info?.allergies?.trim()) parts.push(`Allergies: ${info.allergies.trim()}`);
          if (info?.conditions?.trim()) parts.push(`Conditions: ${info.conditions.trim()}`);
          if (info?.notes?.trim()) parts.push(`Notes: ${info.notes.trim()}`);
          profileData.current.medical_notes = parts.length > 0 ? parts.join(" · ") : undefined;
          advanceTo("Done");
        }}
        onSkip={() => advanceTo("Done")}
      />
    );
  return <SetupCompleteScreen onDone={handleSaveAndComplete} />;
}

function PermissionsRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Permissions">) {
  const [index, setIndex] = useState(0);
  const next = () => {
    if (index >= PERMISSIONS.length - 1) {
      navigation.replace("Home");
      return;
    }
    setIndex((i) => i + 1);
  };
  return <PermissionScreen key={index} index={index} onAllow={next} onSkip={next} />;
}

function HomeRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Home">) {
  return (
    <HomeScreen
      onSos={() => navigation.navigate("Sos", { state: "active" })}
      onNotifications={() => navigation.navigate("Notifications")}
      onSafetyMode={() => navigation.navigate("Safety")}
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
      onSos={() => navigation.navigate("Sos")}
      onAssistant={() => navigation.navigate("Assistant")}
      links={[
        { label: "Notifications", onPress: () => navigation.navigate("Notifications") },
        { label: "Safe Route", onPress: () => navigation.navigate("SafeRoute") },
        { label: "Nearby Help", onPress: () => navigation.navigate("NearbyHelp") },
        { label: "Report Area", onPress: () => navigation.navigate("Report") },
      ]}
    />
  );
}
function SafetyRoute({ navigation }: P<"Safety">) {
  return (
    <PlaceholderScreen
      title="Safety"
      tab="safety"
      onTab={(t) => {
        if (t === "home") navigation.navigate("Home");
        else if (t === "history") navigation.navigate("History");
        else if (t === "profile") navigation.navigate("Profile");
      }}
      onSos={() => navigation.navigate("Sos")}
      onAssistant={() => navigation.navigate("Assistant")}
      links={[
        { label: "Safe Route", onPress: () => navigation.navigate("SafeRoute") },
        { label: "Nearby Help", onPress: () => navigation.navigate("NearbyHelp") },
        { label: "Report Area", onPress: () => navigation.navigate("Report") },
      ]}
    />
  );
}
function ProfileRoute({ navigation }: P<"Profile">) {
  return (
    <PlaceholderScreen
      title="Profile"
      tab="profile"
      onTab={(t) => {
        if (t === "home") navigation.navigate("Home");
        else if (t === "safety") navigation.navigate("Safety");
        else if (t === "history") navigation.navigate("History");
      }}
      onSos={() => navigation.navigate("Sos")}
      onAssistant={() => navigation.navigate("Assistant")}
      links={[
        { label: "Settings", onPress: () => navigation.navigate("Settings") },
        { label: "Data & Privacy", onPress: () => navigation.navigate("DataPrivacy") },
      ]}
    />
  );
}
function SettingsRoute({ navigation }: P<"Settings">) {
  return <PlaceholderScreen title="Settings" onBack={() => navigation.goBack()} links={[{ label: "Data & Privacy", onPress: () => navigation.navigate("DataPrivacy") }]} />;
}
function DataPrivacyRoute({ navigation }: P<"DataPrivacy">) {
  return <PlaceholderScreen title="Data & Privacy" onBack={() => navigation.goBack()} />;
}
function SosRoute({ navigation }: P<"Sos">) {
  return <PlaceholderScreen title="SOS" onBack={() => navigation.goBack()} links={[{ label: "Done", onPress: () => navigation.replace("Home") }]} />;
}
function SafeRouteRoute({ navigation }: P<"SafeRoute">) {
  return <PlaceholderScreen title="Safe Route" onBack={() => navigation.goBack()} />;
}
function NearbyHelpRoute({ navigation }: P<"NearbyHelp">) {
  return <PlaceholderScreen title="Nearby Help" onBack={() => navigation.goBack()} />;
}
function AssistantRoute({ navigation }: P<"Assistant">) {
  return <PlaceholderScreen title="AI Assistant" onBack={() => navigation.goBack()} />;
}
function NotificationsRoute({ navigation }: P<"Notifications">) {
  return <PlaceholderScreen title="Notifications" onBack={() => navigation.goBack()} />;
}
function HomeStubRoute({ navigation }: P<"HomeStub">) {
  return <PlaceholderScreen title="Home (stub)" onBack={() => navigation.goBack()} />;
}

// ---------- History tab → REAL incidents module ----------
function HistoryRoute({ navigation }: P<"History">) {
  return (
    <IncidentsScreen
      onTab={(t: TabKey) => {
        if (t === "home") navigation.navigate("Home");
        else if (t === "safety") navigation.navigate("Safety");
        else if (t === "profile") navigation.navigate("Profile");
      }}
      onOpen={(id) => navigation.navigate("IncidentDetail", { id })}
      onNew={() => navigation.navigate("NewIncident")}
      onAssistant={() => navigation.navigate("Assistant")}
      onSos={() => navigation.navigate("Sos")}
    />
  );
}

// ---------- real incident/evidence routes ----------
function NewIncidentRoute({ navigation }: P<"NewIncident">) {
  return <NewIncidentScreen onBack={() => navigation.goBack()} onCreated={(id) => navigation.replace("IncidentDetail", { id })} />;
}
function IncidentDetailRoute({ navigation, route }: P<"IncidentDetail">) {
  return (
    <IncidentDetailScreen
      id={route.params?.id}
      onBack={() => navigation.goBack()}
      onOpenEvidence={(eid) => navigation.navigate("EvidenceDetail", { id: eid })}
      onAddEvidence={(incidentId) => navigation.navigate("UploadEvidence", { incidentId })}
    />
  );
}
function UploadEvidenceRoute({ navigation, route }: P<"UploadEvidence">) {
  return <UploadEvidenceScreen incidentId={route.params?.incidentId} onBack={() => navigation.goBack()} onDone={() => navigation.goBack()} />;
}
function EvidenceDetailRoute({ navigation, route }: P<"EvidenceDetail">) {
  return <EvidenceDetailScreen id={route.params?.id} onBack={() => navigation.goBack()} />;
}

// ---------- module #12: crowd-sourced incident reporting ----------
function ReportRoute({ navigation }: P<"Report">) {
  return (
    <ReportScreen
      onBack={() => navigation.goBack()}
      onSubmitDone={() => navigation.replace("Home")}
      onViewCommunity={() => navigation.replace("CommunityReports")}
    />
  );
}
function CommunityReportsRoute({ navigation }: P<"CommunityReports">) {
  return <CommunityReportsScreen onBack={() => navigation.goBack()} onReportNew={() => navigation.navigate("Report")} />;
}

// ---------- admin routes (web-gated in the screens) ----------
function AdminDashboardRoute({ navigation }: P<"AdminDashboard">) {
  return (
    <AdminDashboardScreen
      onBack={() => navigation.goBack()}
      onUsers={() => navigation.navigate("AdminUsers")}
      onIncidents={() => navigation.navigate("AdminIncidents")}
    />
  );
}
function AdminUsersRoute({ navigation }: P<"AdminUsers">) {
  return <AdminUsersScreen onBack={() => navigation.goBack()} />;
}
function AdminIncidentsRoute({ navigation }: P<"AdminIncidents">) {
  return <AdminIncidentsScreen onBack={() => navigation.goBack()} />;
}

// ---------- web: admin console only ----------
// On the web the app IS the admin console — the mobile safety flows (splash/onboarding/home/
// incidents/evidence/…) are not registered here, so those routes simply don't exist on web.
// The dashboard is the root, so it has no back button; AdminUsers/AdminIncidents are pushed on top.
function WebAdminNavigator({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Stack.Navigator initialRouteName="AdminDashboard" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard">
        {({ navigation }: P<"AdminDashboard">) => (
          <AdminDashboardScreen
            onUsers={() => navigation.navigate("AdminUsers")}
            onIncidents={() => navigation.navigate("AdminIncidents")}
            onSignOut={onSignOut}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="AdminUsers" component={AdminUsersRoute} />
      <Stack.Screen name="AdminIncidents" component={AdminIncidentsRoute} />
    </Stack.Navigator>
  );
}

function WebAdminApp() {
  // Auth gate against admin_users. `authed === null` while we restore any persisted session so a
  // signed-in operator isn't flashed the login form on refresh.
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    loadAdminSession().then((ok) => alive && setAuthed(ok));
    return () => {
      alive = false;
    };
  }, []);
  if (authed === null) return null;
  if (!authed) return <AdminAuthScreen onAuthed={() => setAuthed(true)} />;
  return (
    <NavigationContainer>
      <WebAdminNavigator onSignOut={() => void adminLogout().then(() => setAuthed(false))} />
    </NavigationContainer>
  );
}

// ---------- native: the full mobile safety app ----------
function MobileApp() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashRoute} />
        <Stack.Screen name="Onboarding" component={OnboardingRoute} />
        <Stack.Screen name="Welcome" component={WelcomeRoute} />
        <Stack.Screen name="Phone" component={PhoneRoute} />
        <Stack.Screen name="Otp" component={OtpRoute} />
        <Stack.Screen name="Setup" component={SetupRoute} />
        <Stack.Screen name="Permissions" component={PermissionsRoute} />
        <Stack.Screen name="Home" component={HomeRoute} options={{ animation: "none" }} />
        <Stack.Screen name="Safety" component={SafetyRoute} options={{ animation: "none" }} />
        <Stack.Screen name="History" component={HistoryRoute} options={{ animation: "none" }} />
        <Stack.Screen name="Profile" component={ProfileRoute} options={{ animation: "none" }} />
        <Stack.Screen name="Settings" component={SettingsRoute} />
        <Stack.Screen name="DataPrivacy" component={DataPrivacyRoute} />
        <Stack.Screen name="Sos" component={SosRoute} />
        <Stack.Screen name="SafeRoute" component={SafeRouteRoute} />
        <Stack.Screen name="NearbyHelp" component={NearbyHelpRoute} />
        <Stack.Screen name="Assistant" component={AssistantRoute} />
        <Stack.Screen name="Report" component={ReportRoute} />
        <Stack.Screen name="CommunityReports" component={CommunityReportsRoute} />
        <Stack.Screen name="Notifications" component={NotificationsRoute} />
        <Stack.Screen name="HomeStub" component={HomeStubRoute} />
        <Stack.Screen name="NewIncident" component={NewIncidentRoute} />
        <Stack.Screen name="IncidentDetail" component={IncidentDetailRoute} />
        <Stack.Screen name="UploadEvidence" component={UploadEvidenceRoute} />
        <Stack.Screen name="EvidenceDetail" component={EvidenceDetailRoute} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardRoute} />
        <Stack.Screen name="AdminUsers" component={AdminUsersRoute} />
        <Stack.Screen name="AdminIncidents" component={AdminIncidentsRoute} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function RootStack() {
  return Platform.OS === "web" ? <WebAdminApp /> : <MobileApp />;
}
