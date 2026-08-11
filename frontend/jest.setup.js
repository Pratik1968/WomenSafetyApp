jest.mock(
  "expo-contacts",
  () => ({
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    getContactsAsync: jest.fn().mockResolvedValue({ data: [] }),
    presentContactPickerAsync: jest.fn().mockResolvedValue(null),
    Fields: { PhoneNumbers: "phoneNumbers" },
  }),
  { virtual: true }
);

jest.mock(
  "expo-contacts/legacy",
  () => ({
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    getContactsAsync: jest.fn().mockResolvedValue({ data: [] }),
    presentContactPickerAsync: jest.fn().mockResolvedValue(null),
    Fields: { PhoneNumbers: "phoneNumbers" },
  }),
  { virtual: true }
);

jest.mock(
  "expo-location",
  () => ({
    requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    getCurrentPositionAsync: jest.fn().mockResolvedValue({
      coords: { latitude: 12.9716, longitude: 77.5946 },
    }),
    reverseGeocodeAsync: jest.fn().mockResolvedValue([{ street: "5th Cross", city: "Indiranagar" }]),
  }),
  { virtual: true }
);

jest.mock(
  "expo-image-picker",
  () => ({
    requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
    launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  }),
  { virtual: true }
);

jest.mock(
  "expo-notifications",
  () => ({
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
    getDevicePushTokenAsync: jest.fn().mockResolvedValue({ type: "android", data: "mock-fcm-token" }),
    AndroidImportance: { MAX: 5 },
  }),
  { virtual: true }
);

jest.mock(
  "expo-camera",
  () => ({
    Camera: {
      requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    },
  }),
  { virtual: true }
);

jest.mock(
  "expo-av",
  () => ({
    Audio: {
      requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    },
  }),
  { virtual: true }
);

jest.mock(
  "expo-speech-recognition",
  () => ({
    ExpoSpeechRecognitionModule: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      abort: jest.fn().mockResolvedValue(undefined),
      requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    },
  }),
  { virtual: true }
);

const mockStorage = new Map();
jest.mock(
  "@react-native-async-storage/async-storage",
  () => ({
    __esModule: true,
    default: {
      setItem: jest.fn((key, value) => {
        mockStorage.set(key, value);
        return Promise.resolve(null);
      }),
      getItem: jest.fn((key) => {
        return Promise.resolve(mockStorage.has(key) ? mockStorage.get(key) : null);
      }),
      removeItem: jest.fn((key) => {
        mockStorage.delete(key);
        return Promise.resolve(null);
      }),
      clear: jest.fn(() => {
        mockStorage.clear();
        return Promise.resolve(null);
      }),
    },
  }),
  { virtual: true }
);

jest.mock(
  "@react-native-firebase/auth",
  () => ({
    getAuth: jest.fn(() => ({
      currentUser: { uid: "test-user-id", phoneNumber: "+919876543210", getIdToken: jest.fn().mockResolvedValue("test-token") },
    })),
    signInWithPhoneNumber: jest.fn().mockResolvedValue({
      confirm: jest.fn().mockResolvedValue({ user: { uid: "test-user-id" } }),
    }),
    onAuthStateChanged: jest.fn((auth, callback) => {
      callback(null);
      return jest.fn();
    }),
    signOut: jest.fn().mockResolvedValue(undefined),
  }),
  { virtual: true }
);

// Default fetch mock: safe fallback so any incidental network call (profile/contacts/
// device services) fails fast instead of hitting the network during tests. Individual
// tests override `global.fetch` when they need to assert on a specific request/response.
beforeEach(() => {
  global.fetch = jest.fn().mockRejectedValue(new Error("Network unavailable in tests"));
});


