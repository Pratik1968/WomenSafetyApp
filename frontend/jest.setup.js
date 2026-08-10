jest.setTimeout(15000);

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
      coords: { latitude: 12.9716, longitude: 77.5946, altitude: 0, accuracy: 5 },
      timestamp: Date.now(),
    }),
    reverseGeocodeAsync: jest.fn().mockResolvedValue([
      { name: "Indiranagar 100 Ft Rd", street: "100 Ft Rd", city: "Bengaluru", region: "Karnataka", postalCode: "560038", country: "India" },
    ]),
    watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
    Accuracy: { Balanced: 3, High: 4 },
  }),
  { virtual: true }
);

jest.mock(
  "expo-notifications",
  () => ({
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
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
  "@supabase/supabase-js",
  () => ({
    createClient: jest.fn(() => ({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
      channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      }),
      removeChannel: jest.fn(),
    })),
  }),
  { virtual: true }
);

jest.mock("react-native-url-polyfill/auto", () => {}, { virtual: true });

jest.mock(
  "expo-speech-recognition",
  () => ({
    ExpoSpeechRecognitionModule: {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      abort: jest.fn().mockResolvedValue(undefined),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    },
  }),
  { virtual: true }
);

const { NativeModules } = require("react-native");
NativeModules.SafetyForegroundModule = {
  startSafetyService: jest.fn().mockResolvedValue(true),
  stopSafetyService: jest.fn().mockResolvedValue(true),
  updateLanguage: jest.fn().mockResolvedValue(true),
  isServiceRunning: jest.fn().mockResolvedValue(false),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};
