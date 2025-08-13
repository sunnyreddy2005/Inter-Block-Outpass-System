// Simple test to check faculty data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vulnkgcuhyhuqiegahfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bG5rZ2N1aHlodXFpZWdhaGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTEwNzgsImV4cCI6MjA3MDQ2NzA3OH0.f-nNqR-PBDqgk4UGnMTAsNSQuNTSRnEFKZjn4DpGst0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFacultyFetch() {
  console.log('Testing faculty fetch...');
  
  const { data, error } = await supabase.from('faculty').select('id, name, email').order('name');
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Faculty found:', data);
    console.log('Number of faculty:', data?.length || 0);
  }
}

testFacultyFetch();
