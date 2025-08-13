// Script to add sample faculty data for testing
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vulnkgcuhyhuqiegahfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bG5rZ2N1aHlodXFpZWdhaGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTEwNzgsImV4cCI6MjA3MDQ2NzA3OH0.f-nNqR-PBDqgk4UGnMTAsNSQuNTSRnEFKZjn4DpGst0';

const supabase = createClient(supabaseUrl, supabaseKey);

const sampleFaculty = [
  {
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh.kumar@klh.edu.in',
    password: 'faculty123',
    branch: 'CSE'
  },
  {
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@klh.edu.in',
    password: 'faculty123',
    branch: 'ECE'
  },
  {
    name: 'Dr. Amit Patel',
    email: 'amit.patel@klh.edu.in',
    password: 'faculty123',
    branch: 'CSIT'
  },
  {
    name: 'Dr. Sunita Reddy',
    email: 'sunita.reddy@klh.edu.in',
    password: 'faculty123',
    branch: 'CSE'
  },
  {
    name: 'Dr. Vikram Singh',
    email: 'vikram.singh@klh.edu.in',
    password: 'faculty123',
    branch: 'ECE'
  }
];

async function addSampleFaculty() {
  console.log('Adding sample faculty data...');
  
  try {
    // First check if faculty table exists and if we have any data
    const { data: existingFaculty, error: checkError } = await supabase
      .from('faculty')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('Error checking faculty table:', checkError.message);
      console.log('You may need to create the faculty table first with this SQL:');
      console.log(`
CREATE TABLE faculty (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  branch VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
      `);
      return;
    }
    
    if (existingFaculty && existingFaculty.length > 0) {
      console.log('Faculty table already has data. Checking for specific records...');
    }
    
    // Insert sample faculty
    const { data, error } = await supabase
      .from('faculty')
      .insert(sampleFaculty)
      .select();
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        console.log('Some faculty already exist. This is normal.');
      } else {
        console.error('Error adding faculty:', error.message);
      }
    } else {
      console.log('Successfully added faculty:', data);
    }
    
    // Verify the data
    const { data: allFaculty, error: fetchError } = await supabase
      .from('faculty')
      .select('*')
      .order('name');
    
    if (fetchError) {
      console.error('Error fetching faculty:', fetchError.message);
    } else {
      console.log('Current faculty in database:', allFaculty);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

addSampleFaculty();
