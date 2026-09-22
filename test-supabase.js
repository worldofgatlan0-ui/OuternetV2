console.log("🟣 TEST START");

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("🟢 SUPABASE LIBRARY IMPORTED");

const supabase = createClient(
    "https://wrncsxgtpaersaqlqmzl.supabase.co",
    "YOUR_EXISTING_PUBLISHABLE_KEY"
);

console.log("✅ CLIENT CREATED");
