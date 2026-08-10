import { Platform } from "react-native";
import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack";

import { PlaceholderScreen } from "../screens/PlaceholderScreen";
import { type TabKey } from "../components/app/BottomNav";

// Real modules (pratik) — #17 Evidence/Incidents, #20 Admin
import { IncidentsScreen } from "../screens/IncidentsScreen";
import { NewIncidentScreen } from "../screens/NewIncidentScreen";
import { IncidentDetailScreen } from "../screens/IncidentDetailScreen";
import { UploadEvidenceScreen } from "../screens/UploadEvidenceScreen";
import { EvidenceDetailScreen } from "../screens/EvidenceDetailScreen";
import { AdminDashboardScreen } from "../screens/AdminDashboardScreen";
import { AdminUsersScreen } from "../screens/AdminUsersScreen";
import { AdminIncidentsScreen } from "../screens/AdminIncidentsScreen";
import { AdminAuthScreen } from "../screens/AdminAuthScreen";
import { loadAdminSession, adminLogout } from "../data/adminAuth";

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Welcome: undefined;
  Phone: undefined;
  Otp: undefined;
  Setup: undefined;
  Permissions: undefined;
  Home: undefined;
  Safety: undefined;
  History: undefined;
  Profile: undefined;
  Settings: undefined;
  DataPrivacy: undefined;
  Sos: undefined;
  SafeRoute: undefined;
  NearbyHelp: undefined;
  Assistant: undefined;
  Report: undefined;
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

// ---------- mock/placeholder routes (owned by other teammates — buttons only) ----------
function SplashRoute({ navigation }: P<"Splash">) {
  return <PlaceholderScreen title="Aegis" links={[{ label: "Get started", onPress: () => navigation.replace("Onboarding") }]} />;
}
function OnboardingRoute({ navigation }: P<"Onboarding">) {
  return (
    <PlaceholderScreen
      title="Onboarding"
      links={[
        { label: "Continue", onPress: () => navigation.replace("Welcome") },
        { label: "Skip", onPress: () => navigation.replace("Welcome") },
      ]}
    />
  );
}
function WelcomeRoute({ navigation }: P<"Welcome">) {
  return <PlaceholderScreen title="Welcome" links={[{ label: "Continue with phone", onPress: () => navigation.navigate("Phone") }]} />;
}
function PhoneRoute({ navigation }: P<"Phone">) {
  return <PlaceholderScreen title="Phone number" onBack={() => navigation.goBack()} links={[{ label: "Continue", onPress: () => navigation.navigate("Otp") }]} />;
}
function OtpRoute({ navigation }: P<"Otp">) {
  return <PlaceholderScreen title="Verify OTP" onBack={() => navigation.goBack()} links={[{ label: "Verify", onPress: () => navigation.navigate("Setup") }]} />;
}
function SetupRoute({ navigation }: P<"Setup">) {
  return <PlaceholderScreen title="Profile setup" onBack={() => navigation.goBack()} links={[{ label: "Continue", onPress: () => navigation.navigate("Permissions") }]} />;
}
function PermissionsRoute({ navigation }: P<"Permissions">) {
  return (
    <PlaceholderScreen
      title="Permissions"
      links={[
        { label: "Allow & continue", onPress: () => navigation.replace("Home") },
        { label: "Skip", onPress: () => navigation.replace("Home") },
      ]}
    />
  );
}
function HomeRoute({ navigation }: P<"Home">) {
  return (
    <PlaceholderScreen
      title="Home"
      tab="home"
      onTab={(t) => {
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
function ReportRoute({ navigation }: P<"Report">) {
  return <PlaceholderScreen title="Report Area" onBack={() => navigation.goBack()} />;
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
