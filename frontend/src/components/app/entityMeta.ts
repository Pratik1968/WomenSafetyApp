// Shared display metadata for incidents + evidence (icons, labels, tones).
import {
  Mic,
  Video,
  Image as ImageIcon,
  Route as RouteIcon,
  FileText,
  Siren,
  Flag,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react-native";
import { colors } from "../../theme/tokens";
import type { BadgeTone } from "../ds/Badge";
import type { EvidenceType, IncidentType, IncidentStatus } from "../../data/models";

export const EVIDENCE_META: Record<EvidenceType, { label: string; Icon: LucideIcon }> = {
  audio: { label: "Audio", Icon: Mic },
  video: { label: "Video", Icon: Video },
  image: { label: "Image", Icon: ImageIcon },
  gps_track: { label: "GPS", Icon: RouteIcon },
  incident_log: { label: "Log", Icon: FileText },
};

export const INCIDENT_META: Record<IncidentType, { label: string; Icon: LucideIcon; color: string }> = {
  sos: { label: "SOS", Icon: Siren, color: colors.emergency },
  journey: { label: "Journey", Icon: RouteIcon, color: colors.primary },
  report: { label: "Report", Icon: Flag, color: colors.primary },
  alert: { label: "Alert", Icon: AlertTriangle, color: colors.warning },
};

export const INCIDENT_STATUS: Record<IncidentStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
  under_review: { label: "Under review", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};
