export type Country = {
  code: string;
  name: string;
  dial: string;
  flag: string;
  digits: number;
};

export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳", digits: 10 },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸", digits: 10 },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧", digits: 10 },
  { code: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪", digits: 9 },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺", digits: 9 },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦", digits: 10 },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪", digits: 10 },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷", digits: 9 },
  { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬", digits: 8 },
  { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵", digits: 10 },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦", digits: 9 },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷", digits: 11 },
];