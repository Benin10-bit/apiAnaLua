import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://khdmnvmlzqexgdqqdasi.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZG1udm1senFleGdkcXFkYXNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkzMjAwMCwiZXhwIjoyMDc0NTA4MDAwfQ.5iKHLooONo_nZXt26HrjZWvAGbGnptfF7Y1rBzXYbM8";

export const supabase = createClient(supabaseUrl, supabaseKey);