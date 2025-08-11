// src/services/ticketService.js
import { supabase } from '../supabaseClient';

// This function fetches admins based on branch
export const fetchAdmins = async (branch) => {
  let query = supabase
    .from('admins')
    .select('id, name, email, branch')
    .order('name');
  
  // If specific branch is requested, filter by that branch
  if (branch && branch !== "All") {
    query = query.eq('branch', branch);
  }
  
  const { data, error } = await query;
    
  if (error) {
    console.error('Error fetching admins:', error.message);
    throw new Error(error.message);
  }
  return data;
};

// This function remains the same
export const submitTicket = async (ticketPayload) => {
  // Ensure creator_id and creator_role are set for new tickets
  const payload = {
    ...ticketPayload,
    creator_id: ticketPayload.creator_id || ticketPayload.student_id || ticketPayload.faculty_id,
    creator_role: ticketPayload.creator_role || (ticketPayload.student_id ? 'student' : (ticketPayload.faculty_id ? 'faculty' : undefined))
  };
  delete payload.student_id;
  delete payload.faculty_id;

  if (!payload.email || typeof payload.email !== 'string' || !payload.email.trim()) {
    throw new Error('Email is required to create a ticket.');
  }

  const response = await fetch('http://localhost:3001/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok) {
    console.error('Error submitting ticket:', result);
    throw new Error(result.error || 'Failed to submit ticket.');
  }
  // Defensive: handle if recipient_name is object or string
  return { ...result, recipient_name: result.recipient_name?.name || result.recipient_name };
};

// This function remains the same
export const fetchTicketsByStudent = async (studentId) => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, recipient_name:admins(name)')
    .eq('creator_id', studentId)
    .eq('creator_role', 'student')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching student tickets:', error.message);
    throw new Error(error.message);
  }
  
  return data.map(ticket => ({ ...ticket, recipient_name: ticket.recipient_name?.name }));
};

// This function remains the same
export const fetchTicketsByFaculty = async (facultyId) => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, recipient_name:admins(name)')
    .eq('creator_id', facultyId)
    .eq('creator_role', 'faculty')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching faculty tickets:', error.message);
    throw new Error(error.message);
  }
  
  return data.map(ticket => ({ ...ticket, recipient_name: ticket.recipient_name?.name }));
};

// This function remains the same
export const fetchTicketsByAdmin = async (adminId) => {
    const { data, error } = await supabase
        .from('tickets')
        .select('*, student_name:students(name), student_email:students(email)')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching admin tickets:', error);
        throw new Error(error.message);
    }
    
    return data.map(ticket => ({
        ...ticket,
        student_name: ticket.student_name?.name,
        student_email: ticket.student_email?.email,
    }));
};

// ✅ CORRECTED: This function now generates an OTP on approval
export const updateTicketStatus = async (ticketId, status) => {
  let updateData = { status };

  // If the ticket is being approved, generate an OTP and expiration time
  if (status === 'Approved') {
    // Generate a random 6-digit number
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    // Set expiration to 20 minutes from now
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    updateData.otp = generatedOtp;
    updateData.otp_expires_at = expiresAt;
  }

  const { data, error } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', ticketId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update ticket:', error.message);
    throw new Error(error.message);
  }
  
  return data;
};
export const verifyOtp = async (email, otp) => {
  console.log("2. Service function called. Fetching from backend...");
  const response = await fetch('http://localhost:3001/api/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });

  console.log("3. Backend response status:", response.status);
  const result = await response.json();

  if (!response.ok) {
    console.error("Backend returned an error:", result);
    throw new Error(result.error || 'Verification failed.');
  }

  return result;
};