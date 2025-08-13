// Test script to verify controllers table and add initial data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vulnkgcuhyhuqiegahfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bG5rZ2N1aHlodXFpZWdhaGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTEwNzgsImV4cCI6MjA3MDQ2NzA3OH0.f-nNqR-PBDqgk4UGnMTAsNSQuNTSRnEFKZjn4DpGst0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testControllerTable() {
  console.log('Testing controllers table...');
  
  try {
    // Try to fetch controllers
    const { data, error } = await supabase.from('controllers').select('*');
    
    if (error) {
      console.error('Controllers table error:', error.message);
      if (error.message.includes('relation "public.controllers" does not exist')) {
        console.log('\n🔧 Controllers table does not exist. Please run this SQL in your Supabase database:');
        console.log(`
CREATE TABLE controllers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO controllers (name, email, password) VALUES 
('System Controller', 'controller@klh.edu.in', 'controller123');
        `);
      }
    } else {
      console.log('Controllers found:', data);
      if (data.length === 0) {
        console.log('\n⚠️ Controllers table exists but is empty. Consider adding the default controller:');
        console.log(`INSERT INTO controllers (name, email, password) VALUES ('System Controller', 'controller@klh.edu.in', 'controller123');`);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testControllerTable();
