// Display metadata for crowd-sourced incident reports (module #12). Kept separate from
// entityMeta.ts (owned by modules #17/#20) but follows the same shape/pattern.
import { AlertTriangle, Eye, Flame, MapPin, UserX, Wallet, type LucideIcon } from "lucide-react-native";
import { colors } from "../../theme/tokens";
import type { ReportType } from "../../data/reports";

export const REPORT_TYPE_META: Record<ReportType, { label: string; Icon: LucideIcon; color: string }> = {
  assault: { label: "Assault", Icon: Flame, color: colors.emergency },
  stalking: { label: "Stalking", Icon: Eye, color: colors.emergency },
  harassment: { label: "Harassment", Icon: AlertTriangle, color: colors.warning },
  theft: { label: "Theft", Icon: Wallet, color: colors.warning },
  suspicious_person: { label: "Suspicious person", Icon: UserX, color: colors.warning },
  unsafe_location: { label: "Unsafe location", Icon: MapPin, color: colors.mutedForeground },
};
