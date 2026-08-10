import { render, screen } from "@testing-library/react-native";
import { EvidenceDetailScreen } from "./EvidenceDetailScreen";
import { getEvidence, getAccessLog } from "../data/evidence";

jest.mock("../data/evidence", () => ({
  getEvidence: jest.fn(),
  getAccessLog: jest.fn(),
  deleteEvidence: jest.fn(),
}));

const evidence = {
  id: "e1", user_id: "u1", incident_id: null, type: "video", storage_bucket: "evidence",
  storage_path: "u1/v.mp4", file_name: "sos-video.mp4", mime_type: "video/mp4", size_bytes: 41943040,
  duration_seconds: 95, checksum_sha256: "deadbeef", is_encrypted: true, encryption_algo: "AES-256-GCM",
  tamper_seal: "seal:1c8d", status: "ready", captured_at: "2026-08-01T10:00:00Z",
  uploaded_at: "2026-08-01T10:01:00Z", created_at: "2026-08-01T10:01:00Z", metadata: {},
};

test("renders evidence metadata and secure-retrieval action", async () => {
  (getEvidence as jest.Mock).mockResolvedValue({ evidence, signedUrl: "https://x/y", expiresIn: 60, expiresAt: "2026-08-01T10:02:00Z" });
  (getAccessLog as jest.Mock).mockResolvedValue([
    { id: "l1", evidence_id: "e1", accessed_by: "u1", action: "upload", signed_url_expires_at: null, accessed_at: "2026-08-01T10:01:00Z", ip: null },
  ]);
  await render(<EvidenceDetailScreen id="e1" />);
  expect(await screen.findByText("sos-video.mp4")).toBeTruthy();
  expect(screen.getByText("Retrieve securely")).toBeTruthy();
  expect(screen.getByText("AES-256-GCM")).toBeTruthy();
});
