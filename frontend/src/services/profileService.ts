import { firebaseAuthService } from "../infrastructure/auth/firebaseAuthService";
import { supabase } from "./supabaseClient";

export interface UserProfile {
  id?: string;
  firebase_uid: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  blood_group?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  created_at?: string;
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const user = firebaseAuthService.getCurrentUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("firebase_uid", user.uid)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // record not found
      console.warn("Error fetching profile from Supabase:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("Failed to retrieve profile:", err);
    return null;
  }
}

export async function saveProfile(profileData: Partial<UserProfile>): Promise<UserProfile | null> {
  const user = firebaseAuthService.getCurrentUser();
  if (!user) throw new Error("No authenticated user found.");

  const fullData = {
    firebase_uid: user.uid,
    phone: profileData.phone || null,
    ...profileData,
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(fullData, { onConflict: "firebase_uid" })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
