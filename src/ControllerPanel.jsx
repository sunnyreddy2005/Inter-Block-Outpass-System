// src/ControllerPanel.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';
import { Key, User, Trash2, Edit2, Plus, CheckCircle, XCircle, FileText, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import './StudentDashBoard.css';

const branches = ['CSE', 'ECE', 'CSIT'];

const ControllerPanel = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [hods, setHods] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newHod, setNewHod] = useState({ facultyId: '', branch: branches[0] });
  const [editingHod, setEditingHod] = useState(null);
  const [activeTab, setActiveTab] = useState('hods'); // 'hods' or 'permissions'

  // Fetch all HODs (admins with branch)
  const fetchHods = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('admins').select('*').order('branch');
    if (error) setError(error.message);
    setHods(data || []);
    setLoading(false);
  };

  // Fetch all faculty for dropdown
  const fetchFaculty = async () => {
    console.log('Fetching faculty...');
    const { data, error } = await supabase.from('faculty').select('id, name, email').order('name');
    if (error) {
      console.error('Error fetching faculty:', error.message);
      setError(error.message);
    } else {
      console.log('Faculty data received:', data);
      setFaculty(data || []);
    }
  };

  // Fetch all tickets/permissions from all users
  const fetchAllTickets = async () => {
    console.log('Fetching all tickets...');
    try {
      // First, fetch all tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        setError(ticketsError.message);
        return;
      }

      console.log('Tickets fetched:', tickets);

      // Fetch students, faculty, and admins separately
      const { data: students } = await supabase.from('students').select('id, name, email');
      const { data: faculty } = await supabase.from('faculty').select('id, name, email'); 
      const { data: admins } = await supabase.from('admins').select('id, name');

      // Map the data manually
      const formattedTickets = tickets.map(ticket => {
        let creator_display_name = 'Unknown';
        let creator_display_email = 'Unknown';
        let admin_display_name = 'Unknown';

        // Find creator info based on creator_role and creator_id
        if (ticket.creator_role === 'student') {
          const student = students?.find(s => s.id === ticket.creator_id);
          if (student) {
            creator_display_name = student.name;
            creator_display_email = student.email;
          }
        } else if (ticket.creator_role === 'faculty') {
          const facultyMember = faculty?.find(f => f.id === ticket.creator_id);
          if (facultyMember) {
            creator_display_name = facultyMember.name;
            creator_display_email = facultyMember.email;
          }
        }

        // Find admin info
        const admin = admins?.find(a => a.id === ticket.admin_id);
        if (admin) {
          admin_display_name = admin.name;
        }

        return {
          ...ticket,
          creator_display_name,
          creator_display_email,
          admin_display_name
        };
      });

      setAllTickets(formattedTickets);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Unexpected error fetching tickets:', err);
      setError('Failed to load tickets');
    }
  };

  useEffect(() => { 
    console.log('Controller Panel mounted, fetching data...');
    fetchHods(); 
    fetchFaculty();
    fetchAllTickets();
  }, []);

  // Add effect to log faculty state changes
  useEffect(() => {
    console.log('Faculty state updated:', faculty);
  }, [faculty]);

  // Add new HOD from faculty
  const handleAddHod = async (e) => {
    e.preventDefault();
    setError('');
    const { facultyId, branch } = newHod;
    if (!facultyId || !branch) {
      setError('Please select a faculty member and branch.');
      return;
    }
    
    // Get selected faculty details
    const selectedFaculty = faculty.find(f => f.id === parseInt(facultyId));
    if (!selectedFaculty) {
      setError('Selected faculty not found.');
      return;
    }

    // Check if faculty is already an HOD
    const existingHod = hods.find(h => h.email === selectedFaculty.email);
    if (existingHod) {
      setError('This faculty member is already an HOD.');
      return;
    }

    // Create new admin record
    const { error } = await supabase.from('admins').insert([{ 
      name: selectedFaculty.name, 
      email: selectedFaculty.email, 
      password: 'admin123', // Default password
      branch 
    }]);
    
    if (error) setError(error.message);
    else {
      setNewHod({ facultyId: '', branch: branches[0] });
      fetchHods();
    }
  };

  // Remove HOD
  const handleRemoveHod = async (id) => {
    console.log('Attempting to remove HOD with ID:', id);
    
    if (!id) {
      console.error('No ID provided for deletion');
      toast.error('Invalid HOD ID');
      return;
    }
    
    // First check if this admin has any tickets assigned
    try {
      const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .select('id')
        .eq('admin_id', id);
      
      if (ticketError) {
        console.error('Error checking tickets:', ticketError);
        toast.error('Error checking admin dependencies');
        return;
      }
      
      if (tickets && tickets.length > 0) {
        const confirmDelete = window.confirm(
          `This HOD has ${tickets.length} ticket(s) assigned to them. ` +
          `Deleting this HOD will also remove all their assigned tickets. ` +
          `Are you sure you want to proceed?`
        );
        
        if (!confirmDelete) {
          console.log('User cancelled deletion due to existing tickets');
          return;
        }
        
        // Delete tickets first, then admin
        console.log(`Deleting ${tickets.length} tickets first...`);
        const { error: deleteTicketsError } = await supabase
          .from('tickets')
          .delete()
          .eq('admin_id', id);
        
        if (deleteTicketsError) {
          console.error('Error deleting tickets:', deleteTicketsError);
          toast.error('Failed to delete associated tickets');
          return;
        }
        
        console.log('Associated tickets deleted successfully');
      } else {
        // No tickets, just confirm admin deletion
        if (!window.confirm('Are you sure you want to remove this HOD? This will permanently delete their admin access.')) {
          console.log('User cancelled deletion');
          return;
        }
      }
      
      // Now delete the admin
      console.log('Sending delete request for admin...');
      const { data, error } = await supabase
        .from('admins')
        .delete()
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Error removing HOD:', error);
        setError(`Failed to remove HOD: ${error.message}`);
        toast.error(`Failed to remove HOD: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log('HOD removed successfully, deleted data:', data);
        const ticketCount = tickets ? tickets.length : 0;
        const message = ticketCount > 0 
          ? `HOD ${data[0].name} and ${ticketCount} associated tickets removed successfully`
          : `HOD ${data[0].name} removed successfully`;
        toast.success(message);
        fetchHods();
        setError('');
      } else {
        console.log('No data returned from delete operation');
        toast.warning('HOD may have already been deleted');
        fetchHods();
      }
    } catch (err) {
      console.error('Unexpected error removing HOD:', err);
      setError('Failed to remove HOD');
      toast.error('Failed to remove HOD');
    }
  };

  // Start editing HOD
  const startEdit = (hod) => setEditingHod(hod);

  // Save HOD changes
  const handleEditHod = async (e) => {
    e.preventDefault();
    const { id, name, email, branch } = editingHod;
    const { error } = await supabase.from('admins').update({ name, email, branch }).eq('id', id);
    if (error) setError(error.message);
    else {
      setEditingHod(null);
      fetchHods();
    }
  };

  // Update ticket status (for permissions management)
  const handleTicketStatusUpdate = async (ticketId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);
      
      if (error) {
        console.error('Error updating ticket status:', error);
        setError(`Failed to update ticket: ${error.message}`);
      } else {
        console.log(`Ticket ${ticketId} status updated to ${newStatus}`);
        fetchAllTickets();
        setError(''); // Clear any previous errors
      }
    } catch (err) {
      console.error('Unexpected error updating ticket:', err);
      setError('Failed to update ticket status');
    }
  };

  // Accept/Deny permissions
  const handleAccept = (ticketId) => {
    handleTicketStatusUpdate(ticketId, 'Approved');
  };
  
  const handleDeny = (ticketId) => {
    handleTicketStatusUpdate(ticketId, 'Rejected');
  };

  // Logout function
  const handleLogout = () => {
    console.log('Logout button clicked - this should appear in console');
    alert('Logout button clicked!'); // Temporary alert for testing
    
    try {
      logout();
      console.log('AuthContext logout called successfully');
      navigate('/login');
      console.log('Navigation attempted');
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Error during logout: ' + error.message);
    }
  };

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="klh-logo-container">
              <img src="/klhlogo.png" alt="KLH University" className="klh-header-logo" />
            </div>
            <div className="app-logo">
              <img src="/logo.png" alt="App Logo" className="app-header-logo" />
              <h1 className="logo-text">Controller Panel</h1>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-logout" 
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="main">
        <div className="container">
          <div className="dashboard-content">
            {/* Navigation Tabs */}
            <div className="nav-tabs">
              <button 
                className={`nav-tab ${activeTab === 'hods' ? 'active' : ''}`}
                onClick={() => setActiveTab('hods')}
              >
                <User size={20} />
                Manage HODs
              </button>
              <button 
                className={`nav-tab ${activeTab === 'permissions' ? 'active' : ''}`}
                onClick={() => setActiveTab('permissions')}
              >
                <Key size={20} />
                All Permissions
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* HODs Management Tab */}
            {activeTab === 'hods' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title"><User size={24}/> Manage HODs</h2>
                </div>
                <div className="card-content">
                  {loading ? <div>Loading...</div> : (
                    <table className="hod-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Branch</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hods.map(hod => (
                          editingHod && editingHod.id === hod.id ? (
                            <tr key={hod.id}>
                              <td><input value={editingHod.name} onChange={e => setEditingHod({ ...editingHod, name: e.target.value })} /></td>
                              <td><input value={editingHod.email} onChange={e => setEditingHod({ ...editingHod, email: e.target.value })} /></td>
                              <td>
                                <select value={editingHod.branch} onChange={e => setEditingHod({ ...editingHod, branch: e.target.value })}>
                                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                              </td>
                              <td>
                                <button className="btn btn-primary" onClick={handleEditHod}><CheckCircle size={16}/> Save</button>
                                <button className="btn btn-secondary" onClick={() => setEditingHod(null)}><XCircle size={16}/> Cancel</button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={hod.id}>
                              <td>{hod.name}</td>
                              <td>{hod.email}</td>
                              <td>{hod.branch}</td>
                              <td>
                                <button 
                                  className="btn btn-secondary" 
                                  onClick={() => {
                                    console.log('Edit button clicked for HOD:', hod);
                                    startEdit(hod);
                                  }}
                                >
                                  <Edit2 size={16}/> Edit
                                </button>
                                <button 
                                  className="btn btn-reject" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Delete button clicked for HOD:', hod);
                                    handleRemoveHod(hod.id);
                                  }}
                                >
                                  <Trash2 size={16}/> Remove
                                </button>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  )}
                  
                  <form className="add-hod-form" onSubmit={handleAddHod} style={{ marginTop: '2rem' }}>
                    <h3>Add New HOD from Faculty</h3>
                    
                    <div className="form-group">
                      <label>Select Faculty:</label>
                      <select 
                        value={newHod.facultyId} 
                        onChange={e => {
                          console.log('Faculty selected:', e.target.value);
                          setNewHod({ ...newHod, facultyId: e.target.value });
                        }}
                        required
                      >
                        <option value="">-- Select Faculty --</option>
                        {faculty.length === 0 ? (
                          <option disabled>Loading faculty...</option>
                        ) : (
                          faculty.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.name} ({f.email})
                            </option>
                          ))
                        )}
                      </select>
                      {!loading && faculty.length === 0 && (
                        <small style={{ color: '#ef4444', marginTop: '0.5rem', display: 'block' }}>
                          No faculty members found in database. Please add faculty records first.
                        </small>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Assign to Branch:</label>
                      <select value={newHod.branch} onChange={e => setNewHod({ ...newHod, branch: e.target.value })}>
                        {branches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <button className="btn btn-primary" type="submit"><Plus size={16}/> Add as HOD</button>
                  </form>
                </div>
              </div>
            )}

            {/* All Permissions Tab */}
            {activeTab === 'permissions' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title"><Key size={24}/> All Permissions & Outpass Requests</h2>
                </div>
                <div className="card-content">
                  {allTickets.length === 0 ? (
                    <div>No permission requests found.</div>
                  ) : (
                    <div className="tickets-container">
                      {allTickets.map(ticket => (
                        <div key={ticket.id} className={`ticket-card ${ticket.status.toLowerCase()}`}>
                          <div className="ticket-header">
                            <h4>{ticket.subject}</h4>
                            <span className={`status-badge ${ticket.status.toLowerCase()}`}>
                              {ticket.status}
                            </span>
                          </div>
                          <div className="ticket-details">
                            <p><strong>From:</strong> {ticket.creator_display_name} ({ticket.creator_display_email})</p>
                            <p><strong>To:</strong> {ticket.admin_display_name}</p>
                            <p><strong>Type:</strong> {ticket.creator_role === 'student' ? 'Student' : 'Faculty'}</p>
                            <p><strong>Campus:</strong> {ticket.from_campus} → {ticket.to_campus}</p>
                            <p><strong>Date & Time:</strong> {ticket.date} at {ticket.time}</p>
                            <p><strong>Department:</strong> {ticket.department}</p>
                            <p><strong>Description:</strong> {ticket.description}</p>
                            <p><strong>Created:</strong> {new Date(ticket.created_at).toLocaleString()}</p>
                            {ticket.otp && <p><strong>OTP:</strong> {ticket.otp}</p>}
                          </div>
                          {ticket.status === 'Pending' && (
                            <div className="ticket-actions">
                              <button 
                                className="btn btn-primary" 
                                onClick={() => handleAccept(ticket.id)}
                              >
                                <CheckCircle size={16}/> Approve
                              </button>
                              <button 
                                className="btn btn-reject" 
                                onClick={() => handleDeny(ticket.id)}
                              >
                                <XCircle size={16}/> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ControllerPanel;
