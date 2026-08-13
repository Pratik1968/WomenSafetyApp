import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack";

import { PlaceholderScreen } from "../screens/PlaceholderScreen";
import { FakeCallScreen } from "../screens/FakeCallScreen";
import { IncomingCallScreen } from "../screens/IncomingCallScreen";

// Add routes here as you build screens under `src/screens/`.
export type RootStackParamList = {
  Home: undefined;
  FakeCall: undefined;
  IncomingCall: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function FakeCallRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "FakeCall">) {
  return <FakeCallScreen onBack={() => navigation.goBack()} />;
}

function IncomingCallRouteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "IncomingCall">) {
  return <IncomingCallScreen />;
}

export function RootStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={PlaceholderScreen} />
        <Stack.Screen name="FakeCall" component={FakeCallRouteScreen} />
        <Stack.Screen name="IncomingCall" component={IncomingCallRouteScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
