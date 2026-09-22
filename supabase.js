import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://wrncsxgtpaersaqlqmzl.supabase.co";
const SUPABASE_KEY = "sb_publishable_HTf6RRz-4PNfl3iFUbqEeg_TSyaIHWV";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);