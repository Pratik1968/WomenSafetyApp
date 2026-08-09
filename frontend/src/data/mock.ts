export type PhoneContact = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  relation: string;
};

export const PHONE_CONTACTS: PhoneContact[] = [
  { id: "c1", name: "Amma", initials: "AM", phone: "+91 98450 11234", relation: "Mother" },
  { id: "c2", name: "Sirisha Reddy", initials: "SR", phone: "+91 99012 44871", relation: "Sister" },
  { id: "c3", name: "Nanna", initials: "NA", phone: "+91 98860 77210", relation: "Father" },
  { id: "c4", name: "Meera Iyer", initials: "MI", phone: "+91 97411 20983", relation: "Best friend" },
  { id: "c5", name: "Arjun Rao", initials: "AR", phone: "+91 90080 55341", relation: "Colleague" },
  { id: "c6", name: "Hostel Warden", initials: "HW", phone: "+91 80 4123 9900", relation: "Warden" },
  { id: "c7", name: "Kavya Nair", initials: "KN", phone: "+91 93425 61200", relation: "Roommate" },
];

/* ------------------------------------------------------------------ Home */

export const USER = {
  firstName: "Rama Krishna",
  initials: "RK",
};

export type Activity = {
  id: string;
  kind: "journey" | "sos" | "report" | "alert";
  title: string;
  detail: string;
  time: string;
};

export const RECENT_ACTIVITY: Activity[] = [
  {
    id: "a1",
    kind: "journey",
    title: "Journey completed safely",
    detail: "Office → Home · 24 min",
    time: "Yesterday, 9:12 PM",
  },
  {
    id: "a2",
    kind: "report",
    title: "Unsafe area reported",
    detail: "Poor lighting · 5th Cross, Indiranagar",
    time: "Mon, 8:40 PM",
  },
  {
    id: "a3",
    kind: "alert",
    title: "Caution alert nearby",
    detail: "3 reports in the last 7 days",
    time: "Sun, 7:05 PM",
  },
];

/* --------------------------------------------------------- Notifications */

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
  tone?: "brand" | "warning" | "success" | "emergency";
};

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    title: "Amma is now a trusted contact",
    body: "She'll be notified the moment you start a monitored journey.",
    time: "12 min ago",
    unread: true,
    tone: "success",
  },
  {
    id: "n2",
    title: "Caution in your area tonight",
    body: "3 reports near Indiranagar 100 Ft Road in the last week.",
    time: "1 h ago",
    unread: true,
    tone: "warning",
  },
  {
    id: "n3",
    title: "Journey summary ready",
    body: "Office → Home. You arrived safely in 24 minutes.",
    time: "Yesterday",
    tone: "brand",
  },
  {
    id: "n4",
    title: "Your report was reviewed",
    body: "Thank you. The area is now marked for 47 women nearby.",
    time: "Mon",
    tone: "brand",
  },
];

/* ------------------------------------------------------------- Journeys */

export const PLACES = [
  { id: "p1", name: "Home", detail: "12, Nandi Layout, Indiranagar", tag: "Saved" },
  { id: "p2", name: "Office — Prestige Tech Park", detail: "Marathahalli, 8.4 km", tag: "Saved" },
  { id: "p3", name: "Amma's house", detail: "Jayanagar 4th Block, 11 km", tag: "Saved" },
  { id: "p4", name: "Phoenix Marketcity", detail: "Whitefield Road, 6.1 km", tag: "Recent" },
];

export const TRANSPORT = [
  { id: "walk", label: "Walking", detail: "Step-by-step check-ins" },
  { id: "bike", label: "Bike", detail: "Route + speed monitoring" },
  { id: "car", label: "Car", detail: "Own vehicle" },
  { id: "cab", label: "Cab", detail: "Share trip + plate number" },
  { id: "transit", label: "Public transport", detail: "Stop-by-stop tracking" },
];

/** A short, believable route through Indiranagar, Bengaluru. */
export const JOURNEY_PATH = [
  { lat: 12.9784, lng: 77.6408 },
  { lat: 12.9761, lng: 77.6432 },
  { lat: 12.9738, lng: 77.6449 },
  { lat: 12.9705, lng: 77.6461 },
  { lat: 12.9672, lng: 77.6489 },
  { lat: 12.9648, lng: 77.6524 },
];

export const JOURNEY_CENTER = { lat: 12.9715, lng: 77.6465 };

/* ------------------------------------------------------- Safety dashboard */

export const SAFETY_TIPS = [
  {
    id: "t1",
    title: "Share your cab plate, always",
    body: "A 3-second screenshot to one person changes how a ride ends.",
    minutes: 2,
  },
  {
    id: "t2",
    title: "Walk the lit side, even if it's longer",
    body: "Aegis routes prefer lighting over distance after 8 PM.",
    minutes: 1,
  },
  {
    id: "t3",
    title: "What to say on an emergency call",
    body: "Location first, then what happened. Keep it to two sentences.",
    minutes: 3,
  },
];

export const CRIME_ZONES = [
  { id: "z1", name: "100 Ft Road underpass", detail: "7 reports · poor lighting", level: "high" },
  { id: "z2", name: "5th Cross, Indiranagar", detail: "3 reports · isolated after 10 PM", level: "medium" },
  { id: "z3", name: "Old Airport Road bus stop", detail: "1 report · crowded", level: "low" },
] as const;

/* --------------------------------------------------------- Nearby help */

export type HelpPlace = {
  id: string;
  name: string;
  detail: string;
  distance: string;
  open: boolean;
  kind: "police" | "hospital" | "ngo";
  position: LatLngLike;
};

type LatLngLike = { lat: number; lng: number };

export const HELP_PLACES: HelpPlace[] = [
  {
    id: "h1",
    name: "Indiranagar Police Station",
    detail: "100 Ft Road · Women's help desk",
    distance: "600 m",
    open: true,
    kind: "police",
    position: { lat: 12.9756, lng: 77.6402 },
  },
  {
    id: "h2",
    name: "HAL Police Outpost",
    detail: "Old Airport Road",
    distance: "1.4 km",
    open: true,
    kind: "police",
    position: { lat: 12.9689, lng: 77.6491 },
  },
  {
    id: "h3",
    name: "Manipal Hospital",
    detail: "24×7 emergency · trauma care",
    distance: "1.1 km",
    open: true,
    kind: "hospital",
    position: { lat: 12.9601, lng: 77.6486 },
  },
  {
    id: "h4",
    name: "Chinmaya Mission Hospital",
    detail: "24×7 emergency",
    distance: "2.3 km",
    open: true,
    kind: "hospital",
    position: { lat: 12.9772, lng: 77.6511 },
  },
  {
    id: "h5",
    name: "Vimochana Women's Support",
    detail: "Counselling · legal aid",
    distance: "3.0 km",
    open: false,
    kind: "ngo",
    position: { lat: 12.9822, lng: 77.6338 },
  },
];

export const EMERGENCY_NUMBERS = [
  { id: "e1", label: "Police", number: "100" },
  { id: "e2", label: "Women's helpline", number: "1091" },
  { id: "e3", label: "Ambulance", number: "108" },
  { id: "e4", label: "National emergency", number: "112" },
];

/* ------------------------------------------------------------- History */

export type Incident = {
  id: string;
  kind: "journey" | "sos" | "report" | "alert";
  title: string;
  place: string;
  date: string;
  status: "resolved" | "under-review" | "safe" | "cancelled";
  danger: number;
};

export const INCIDENTS: Incident[] = [
  {
    id: "i1",
    kind: "sos",
    title: "SOS triggered",
    place: "100 Ft Road underpass",
    date: "12 Jun · 9:42 PM",
    status: "resolved",
    danger: 78,
  },
  {
    id: "i2",
    kind: "journey",
    title: "Monitored journey",
    place: "Office → Home",
    date: "11 Jun · 9:12 PM",
    status: "safe",
    danger: 12,
  },
  {
    id: "i3",
    kind: "report",
    title: "Unsafe area reported",
    place: "5th Cross, Indiranagar",
    date: "9 Jun · 8:40 PM",
    status: "under-review",
    danger: 44,
  },
  {
    id: "i4",
    kind: "alert",
    title: "Off-route check-in",
    place: "Old Airport Road",
    date: "4 Jun · 10:05 PM",
    status: "cancelled",
    danger: 31,
  },
];

export const INCIDENT_TIMELINE = [
  { id: "s1", time: "9:42 PM", title: "SOS triggered", detail: "Held for 3 seconds", tone: "emergency" },
  { id: "s2", time: "9:42 PM", title: "Location locked", detail: "Accuracy ±6 m", tone: "brand" },
  { id: "s3", time: "9:43 PM", title: "4 contacts notified", detail: "Amma, Nanna, Meera, Kavya", tone: "brand" },
  { id: "s4", time: "9:43 PM", title: "Audio recording started", detail: "Encrypted on your device", tone: "warning" },
  { id: "s5", time: "9:51 PM", title: "Meera reached you", detail: "Marked safe by you", tone: "success" },
] as const;

/* ------------------------------------------------------ AI assistant */

export type ChatMessage = { id: string; from: "user" | "aegis"; text: string; time: string };

export const CHAT: ChatMessage[] = [
  {
    id: "m1",
    from: "aegis",
    text: "Hi Rama. I'm here whenever you need. Ask me anything — or tap a quick action below.",
    time: "9:12 PM",
  },
  {
    id: "m2",
    from: "user",
    text: "I'm walking home alone and a car has been following me for two streets.",
    time: "9:13 PM",
  },
  {
    id: "m3",
    from: "aegis",
    text: "Let's make you visible. Cross to the lit side of the road and walk towards Indiranagar Police Station — it's 600 m ahead on your right.\n\nI can start Safety Mode and tell Amma and Meera where you are. Want me to?",
    time: "9:13 PM",
  },
];

export const CHAT_QUICK = [
  "Start Safety Mode",
  "Nearest police station",
  "Someone is following me",
  "Is this area safe now?",
];

/* ------------------------------------------------------------ Report */

export const REPORT_CATEGORIES = [
  { id: "r1", label: "Poor lighting" },
  { id: "r2", label: "Harassment" },
  { id: "r3", label: "Stalking" },
  { id: "r4", label: "Isolated stretch" },
  { id: "r5", label: "Unsafe transport" },
  { id: "r6", label: "Other" },
];

/* ------------------------------------------------------------ Routes */

export const SAFE_ROUTES = [
  {
    id: "sr1",
    label: "Safest",
    detail: "Well-lit · 2 police posts on the way",
    time: "26 min",
    distance: "2.1 km",
    risk: "low",
  },
  {
    id: "sr2",
    label: "Balanced",
    detail: "Slightly shorter · one quiet stretch",
    time: "22 min",
    distance: "1.8 km",
    risk: "medium",
  },
  {
    id: "sr3",
    label: "Fastest",
    detail: "Two unlit lanes after 9 PM",
    time: "18 min",
    distance: "1.5 km",
    risk: "high",
  },
] as const;
