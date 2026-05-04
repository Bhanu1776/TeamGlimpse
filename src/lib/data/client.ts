import { mockClient } from "./mock-client";

// The single data access point for the whole app.
// To swap to Supabase: replace mockClient with a supabaseClient
// that implements the same interface. No screen changes needed.
export const dataClient = mockClient;
