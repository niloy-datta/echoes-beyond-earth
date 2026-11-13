import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Only publishable keys belong in browser code. Never use a service role key here.
export const supabase = url && key ? createClient(url, key) : null;
