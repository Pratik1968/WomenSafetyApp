import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import { firebaseAuthService } from "../infrastructure/auth/firebaseAuthService";
import { envConfig } from "../config/env.config";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || envConfig.SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || envConfig.SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  accessToken: async () => {
    return firebaseAuthService.getIdToken();
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
