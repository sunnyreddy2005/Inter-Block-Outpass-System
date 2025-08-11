// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vulnkgcuhyhuqiegahfa.supabase.co'; // Updated to match your database
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bG5rZ2N1aHlodXFpZWdhaGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTEwNzgsImV4cCI6MjA3MDQ2NzA3OH0.f-nNqR-PBDqgk4UGnMTAsNSQuNTSRnEFKZjn4DpGst0'; // Updated to match your key
export const supabase = createClient(supabaseUrl, supabaseKey);
