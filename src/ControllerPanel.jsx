// src/ControllerPanel.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Key, User, Trash2, Edit2, Plus, CheckCircle, XCircle, FileText, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import './StudentDashBoard.css';

const branches = ['CSE', 'ECE', 'CSIT'];

const ControllerPanel = () => {
  const navigate = useNavigate();
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
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          students!inner(name, email),
          faculty!inner(name, email),
          admins!inner(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching tickets:', error);
        setError(error.message);
      } else {
        console.log('Tickets fetched:', data);
        // Format the tickets with proper creator information
        const formattedTickets = data.map(ticket => ({
          ...ticket,
          creator_display_name: ticket.creator_role === 'student' 
            ? ticket.students?.name 
            : ticket.faculty?.name,
          creator_display_email: ticket.creator_role === 'student' 
            ? ticket.students?.email 
            : ticket.faculty?.email,
          admin_display_name: ticket.admins?.name
        }));
        setAllTickets(formattedTickets);
      }
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
    
    if (!window.confirm('Are you sure you want to remove this HOD? This will permanently delete their admin access.')) {
      console.log('User cancelled deletion');
      return;
    }
    
    try {
      console.log('Sending delete request to Supabase...');
      const { data, error } = await supabase
        .from('admins')
        .delete()
        .eq('id', id)
        .select(); // Add select to see what was deleted
      
      if (error) {
        console.error('Error removing HOD:', error);
        setError(`Failed to remove HOD: ${error.message}`);
        toast.error(`Failed to remove HOD: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log('HOD removed successfully, deleted data:', data);
        toast.success(`HOD ${data[0].name} removed successfully`);
        fetchHods();
        setError(''); // Clear any previous errors
      } else {
        console.log('No data returned from delete operation');
        toast.warning('HOD may have already been deleted');
        fetchHods(); // Refresh the list anyway
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
    if (window.confirm('Are you sure you want to logout?')) {
      // Clear any stored user data
      localStorage.removeItem('user');
      localStorage.removeItem('userData');
      localStorage.removeItem('currentUser');
      // Navigate to login page
      navigate('/');
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
            <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
              <LogOut size={20} />
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
