import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vlgmdueyhwtpylqmugku.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZ21kdWV5aHd0cHlscW11Z2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjQ5MDksImV4cCI6MjA3ODU0MDkwOX0.UpByNTnHaBGHsIAOOxPiotgfYZmZ-J7eb-vVeFzso8k";

export const supabase = createClient(supabaseUrl, supabaseKey);
