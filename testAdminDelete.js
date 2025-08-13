// Test script to check admin deletion permissions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vulnkgcuhyhuqiegahfa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bG5rZ2N1aHlodXFpZWdhaGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTEwNzgsImV4cCI6MjA3MDQ2NzA3OH0.f-nNqR-PBDqgk4UGnMTAsNSQuNTSRnEFKZjn4DpGst0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminOperations() {
  console.log('Testing admin table operations...');
  
  try {
    // First, list all admins
    console.log('1. Fetching all admins...');
    const { data: admins, error: fetchError } = await supabase.from('admins').select('*');
    
    if (fetchError) {
      console.error('Error fetching admins:', fetchError);
      return;
    }
    
    console.log('Current admins:', admins);
    
    if (admins.length === 0) {
      console.log('No admins found to test deletion.');
      return;
    }
    
    // Test if we can create a temporary admin for deletion test
    console.log('2. Creating a test admin...');
    const { data: newAdmin, error: insertError } = await supabase
      .from('admins')
      .insert([{ 
        name: 'Test Admin DELETE ME', 
        email: 'test.delete@klh.edu.in', 
        password: 'test123',
        branch: 'CSE'
      }])
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating test admin:', insertError);
      return;
    }
    
    console.log('Test admin created:', newAdmin);
    
    // Now try to delete the test admin
    console.log('3. Attempting to delete test admin...');
    const { data: deletedData, error: deleteError } = await supabase
      .from('admins')
      .delete()
      .eq('id', newAdmin.id)
      .select();
    
    if (deleteError) {
      console.error('Delete operation failed:', deleteError);
      console.log('This might be due to RLS policies or permissions.');
    } else {
      console.log('Delete operation successful:', deletedData);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testAdminOperations();
