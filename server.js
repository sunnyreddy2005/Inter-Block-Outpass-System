import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// --- Initialize Express App ---
const app = express();
const port = 3001;

// --- Initialize Supabase Client ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- API Endpoints ---

// This endpoint is correct.
app.get('/api/admins', async (req, res) => {
    const { data, error } = await supabase
        .from('admins')
        .select('id, name, email, branch')
        .order('name');
    if (error) {
        console.error('Error fetching admins:', error.message);
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// ✅ CORRECTED: This endpoint now uses the correct 'creator_id' and 'creator_role' columns.
app.get('/api/tickets/student/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const { data, error } = await supabase
        .from('tickets')
        .select('*, admins ( name )')
        .eq('creator_id', studentId)
        .eq('creator_role', 'student')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching student tickets:', error.message);
        return res.status(500).json({ error: error.message });
    }
    const formattedData = data.map(ticket => ({
        ...ticket,
        recipient_name: ticket.admins?.name
    }));
    res.json(formattedData);
});

// ✅ CORRECTED: This endpoint now properly joins on the creator's tables.
app.get('/api/tickets/admin/:adminId', async (req, res) => {
    const { adminId } = req.params;
    console.log(`[SERVER] Fetching tickets for admin ID: ${adminId}`);
    
    try {
        // Get all tickets for this admin
        const { data: tickets, error: ticketsError } = await supabase
            .from('tickets')
            .select('*')
            .eq('admin_id', adminId)
            .order('created_at', { ascending: false });

        if (ticketsError) {
            console.error('Error fetching admin tickets:', ticketsError.message);
            return res.status(500).json({ error: ticketsError.message });
        }

        console.log(`[SERVER] Found ${tickets.length} tickets`);

        // Get creator details for each ticket
        const enrichedTickets = await Promise.all(tickets.map(async (ticket) => {
            const creatorTable = ticket.creator_role === 'student' ? 'students' : 'faculty';
            console.log(`[SERVER] Getting creator from ${creatorTable} for ticket ${ticket.id}`);
            
            const { data: creator, error: creatorError } = await supabase
                .from(creatorTable)
                .select('name, email, roll_number')
                .eq('id', ticket.creator_id)
                .single();

            if (creatorError) {
                console.error(`Error fetching creator from ${creatorTable}:`, creatorError.message);
            }

            // Extract roll number from email if not available in database
            let rollNumber = creator?.roll_number;
            if (!rollNumber && creator?.email) {
                // Extract roll number from email (assuming format: rollnumber@domain.com)
                const emailMatch = creator.email.match(/^(\d{10}|\d{9}|\w+\d{4})/);
                rollNumber = emailMatch ? emailMatch[1] : 'N/A';
            }

            return {
                ...ticket,
                student_name: creator?.name || 'Unknown',
                student_email: creator?.email || 'Unknown',
                student_roll: rollNumber || 'N/A'
            };
        }));

        console.log(`[SERVER] Successfully enriched ${enrichedTickets.length} tickets`);
        res.json(enrichedTickets);
        
    } catch (error) {
        console.error('Unexpected error in admin tickets endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ✅ CORRECTED: This endpoint now uses the correct 'creator_id' and 'creator_role' columns.
app.post('/api/tickets', async (req, res) => {
    const { creator_id, creator_role, admin_id, subject, description, from_campus, to_campus, request_date, request_time, email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ error: 'Email is required to create a ticket.' });
    }
    const { data, error } = await supabase
        .from('tickets')
        .insert({ creator_id, creator_role, admin_id, subject, description, from_campus, to_campus, request_date, request_time, email: email.trim() })
        .select('*, admins(name)')
        .single();

    if (error) {
        console.error('Error creating ticket:', error.message);
        return res.status(500).json({ error: error.message });
    }
    const formattedData = { ...data, recipient_name: data.admins?.name };
    res.status(201).json(formattedData);
});

// This endpoint is correct.
app.put('/api/tickets/:ticketId/status', async (req, res) => {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }
    
    let updatePayload = { status };

    if (status === 'Approved') {
        const { data: ticketData, error: fetchError } = await supabase
            .from('tickets')
            .select('request_date, request_time')
            .eq('id', ticketId)
            .single();

        if (fetchError) throw new Error('Could not find ticket to approve.');

        const requestDateTime = new Date(`${ticketData.request_date}T${ticketData.request_time}`);
        updatePayload.otp = Math.floor(100000 + Math.random() * 900000).toString();
        updatePayload.otp_expires_at = new Date(requestDateTime.getTime() + 25 * 60 * 1000).toISOString();
        updatePayload.otp_is_used = false;
    }

    const { data, error } = await supabase
        .from('tickets')
        .update(updatePayload)
        .eq('id', ticketId)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating ticket status:', error.message);
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// ✅ CORRECTED: This endpoint now includes the 'faculty' table in its checks.
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const tables = ['admins', 'students', 'faculty', 'vo_officers'];
    
    for (const table of tables) {
        const { data: user, error } = await supabase
            .from(table)
            .select('*')
            .eq('email', email)
            .single();

        if (user && user.password === password) {
            let role = 'student'; // default
            if (table === 'admins') role = 'admin';
            if (table === 'faculty') role = 'faculty';
            if (table === 'vo_officers') role = 'vo';

            const { password, ...safeUser } = user;
            const responsePayload = { ...safeUser, role };
            
            console.log('✅ Server is sending back this user:', responsePayload);
            return res.json(responsePayload);
        }
    }

    return res.status(401).json({ error: 'Invalid credentials' });
});app.post('/api/verify-otp', async (req, res) => {
    console.log('--- [SERVER] OTP VERIFICATION REQUEST ---');
    const { email, otp } = req.body;
    console.log(`[SERVER] Email: ${email}, OTP: ${otp}`);

    if (!email || !otp) {
        console.log('[SERVER] ❌ Missing email or OTP');
        return res.status(400).json({ error: "Email and OTP are required." });
    }

    try {
        // Step 1: Find ticket with matching OTP and email
        console.log(`[SERVER] 🔍 Searching for ticket with OTP: ${otp} and email: ${email}`);
        const { data: tickets, error: ticketError } = await supabase
            .from('tickets')
            .select('*')
            .eq('otp', otp)
            .ilike('email', email.trim()); // Use the ticket's email field, case-insensitive

        if (ticketError) {
            console.log('[SERVER] ❌ Database error:', ticketError);
            return res.status(500).json({ error: "Database error occurred." });
        }

        if (!tickets || tickets.length === 0) {
            console.log('[SERVER] ❌ No ticket found with this OTP and email combination');
            return res.status(400).json({ error: "Invalid OTP or email - no matching ticket found." });
        }

        const ticket = tickets[0];
        console.log(`[SERVER] ✅ Found ticket ID: ${ticket.id}, Status: ${ticket.status}`);

        // Step 2: Validate ticket status
        if (ticket.status !== 'Approved') {
            console.log(`[SERVER] ❌ Ticket status is ${ticket.status}, not Approved`);
            return res.status(400).json({ 
                error: `Ticket is ${ticket.status.toLowerCase()}, not approved for verification.` 
            });
        }

        // Step 3: Check if OTP is already used
        if (ticket.otp_is_used) {
            console.log('[SERVER] ❌ OTP has already been used');
            return res.status(400).json({ error: "OTP has already been used." });
        }

        // Step 4: Check if OTP has expired
        if (ticket.otp_expires_at) {
            const now = new Date();
            const otpExpiresAt = new Date(ticket.otp_expires_at);
            if (now > otpExpiresAt) {
                console.log('[SERVER] ❌ OTP has expired');
                return res.status(400).json({ error: "OTP has expired." });
            }
        }

        // Step 5: Get creator details
        console.log('[SERVER] 🔍 Fetching creator details...');
        const creatorTable = ticket.creator_role === 'student' ? 'students' : 'faculty';
        
        const { data: creatorData, error: creatorError } = await supabase
            .from(creatorTable)
            .select('*')
            .eq('id', ticket.creator_id)
            .single();

        if (creatorError || !creatorData) {
            console.log('[SERVER] ❌ Creator not found');
            return res.status(404).json({ error: "Creator details not found." });
        }

        // Step 6: Extract roll number from email if not in database
        let rollNumber = creatorData.roll_number;
        if (!rollNumber && creatorData.email) {
            const emailMatch = creatorData.email.match(/^(\d{10}|\d{9}|\w+\d{4})/);
            rollNumber = emailMatch ? emailMatch[1] : 'N/A';
        }

        // Step 7: Mark OTP as used and update ticket status
        const { data: updatedTicket, error: updateError } = await supabase
            .from('tickets')
            .update({ 
                otp_is_used: true, // Mark OTP as used
                status: 'Collected' // Update status to collected
            })
            .eq('id', ticket.id)
            .select()
            .single();

        if (updateError) {
            console.error('[SERVER] Error updating ticket status:', updateError);
            return res.status(500).json({ error: "Error updating ticket status: " + updateError.message });
        }

        // Step 8: Return complete details
        const response = {
            success: true,
            message: "OTP verified successfully! Entry approved.",
            ticket: {
                id: ticket.id,
                subject: ticket.subject,
                description: ticket.description,
                status: 'Collected',
                from_campus: ticket.from_campus,
                to_campus: ticket.to_campus,
                request_date: ticket.request_date,
                request_time: ticket.request_time,
                created_at: ticket.created_at
            },
            student: {
                name: creatorData.name,
                email: creatorData.email,
                roll_number: rollNumber,
                role: ticket.creator_role,
                department: creatorData.department || 'N/A',
                year: creatorData.year || 'N/A',
                phone: creatorData.phone || 'N/A'
            }
        };

        console.log('[SERVER] ✅ OTP verification successful');
        console.log('[SERVER] Creator Details:', {
            name: creatorData.name,
            roll: rollNumber,
            email: creatorData.email,
            role: ticket.creator_role
        });

        res.json(response);

    } catch (error) {
        console.error('[SERVER] ❌ Unexpected error in OTP verification:', error);
        res.status(500).json({ error: 'Internal server error during verification: ' + error.message });
    }
});
// --- Start Server ---
app.listen(port, () => {
    console.log(`✅ Supabase proxy server running at http://localhost:${port}`);
});
