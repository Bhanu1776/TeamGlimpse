import { supabaseClient } from "./supabase-client";

// The single data access point for the whole app.
// Backed by Supabase. Swap implementation here without touching any screen.
export const dataClient = supabaseClient;
