export interface TrustedFace {
  id: string;
  name: string;
  relationship: string;
  created_at?: string;
}

export interface FaceRegistrationResponse {
  success: boolean;
  message: string;
  face: TrustedFace;
}

export interface FaceListResponse {
  success: boolean;
  faces: TrustedFace[];
}

export interface FaceVerificationResponse {
  success: boolean;
  verified: boolean;
  similarity?: number;
  threshold?: number;
  message?: string;
  match?: {
    id: string;
    name: string;
    relationship: string;
  } | null;
}