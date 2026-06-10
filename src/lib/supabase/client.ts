import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Browser-safe Supabase client (anon key only). */
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, { auth: { persistSession: true } })
    : null;
