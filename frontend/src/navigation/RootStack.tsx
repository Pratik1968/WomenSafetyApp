import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { PlaceholderScreen } from "../screens/PlaceholderScreen";

// Add routes here as you build screens under `src/screens/`.
export type RootStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={PlaceholderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
