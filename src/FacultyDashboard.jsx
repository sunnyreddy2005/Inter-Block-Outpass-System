// src/pages/FacultyDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // ✅ 1. Import your authentication hook
// ✅ 2. CRITICAL FIX: Import fetchTicketsByFaculty instead of fetchTicketsByStudent
import { fetchAdmins, fetchTicketsByFaculty as fetchMyTickets, submitTicket } from './services/ticketService';
import { toast } from 'react-toastify';
import { Calendar, Clock, Send, Eye, Plus, LogOut, FileText } from 'lucide-react';
import './StudentDashBoard.css'; // Reusing the same CSS file

const FacultyDashboard = () => {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth(); // Get the REAL logged-in user

    const [activeTab, setActiveTab] = useState('raise-ticket');
    const [tickets, setTickets] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        subject: '',
        adminId: '',
        department: '', // Add department field
        fromCampus: '',
        toCampus: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        description: ''
    });

    const loadData = useCallback(async () => {
        if (!currentUser?.id) return;

        setIsLoading(true);
        setError(null);
        try {
            // Load all admins for department selection
            const [adminsData, ticketsData] = await Promise.all([
                fetchAdmins("All"),
                fetchMyTickets(currentUser.id)
            ]);
            setAdmins(adminsData);
            setTickets(ticketsData);
        } catch (err) {
            console.error("Failed to load dashboard data:", err);
            setError("Could not load data. Please refresh the page.");
        } finally {
            setIsLoading(false);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
        } else {
            loadData();
        }
    }, [currentUser, loadData, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newFormData = { ...prev, [name]: value };
            
            // Auto-assign adminId when department changes
            if (name === 'department' && value) {
                const departmentAdmin = admins.find(admin => admin.branch === value);
                if (departmentAdmin) {
                    newFormData.adminId = departmentAdmin.id;
                    console.log(`Auto-assigned ${value} HOD:`, departmentAdmin.name);
                }
            }
            
            return newFormData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { subject, adminId, department, fromCampus, toCampus, date, time } = formData;
        if (!subject || !adminId || !department || !fromCampus || !toCampus || !date || !time) {
            toast.warn('Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);
        try {
            // ✅ 4. This payload correctly identifies the creator as a 'faculty'
            const ticketPayload = {
                creator_id: currentUser.id,
                creator_role: currentUser.role,
                admin_id: parseInt(adminId, 10),
                subject,
                description: formData.description,
                from_campus: fromCampus,
                to_campus: toCampus,
                request_date: date,
                request_time: time
            };

            const newTicketFromServer = await submitTicket(ticketPayload);
            toast.success('Ticket submitted successfully!');
            setTickets(prevTickets => [newTicketFromServer, ...prevTickets]);
            setFormData({
                subject: '', adminId: '', fromCampus: '', toCampus: '',
                date: new Date().toISOString().split('T')[0], time: '', description: ''
            });
            setActiveTab('view-tickets');
        } catch (err) {
            console.error("Failed to submit ticket:", err);
            toast.error(`Submission failed: Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getStatusClass = (status) => {
        const statusMap = {
            'Pending': 'status-pending',
            'Approved': 'status-completed',
            'Rejected': 'status-rejected'
        };
        return statusMap[status] || 'status-pending';
    };

    if (!currentUser) {
        return <div>Loading...</div>;
    }

    return (
        <div className="dashboard">
            <header className="header">
                <div className="header-content">
                    <div className="logo">
                        <FileText size={20} />
                        <h1 className="logo-text">Faculty Dashboard</h1>
                    </div>
                    <div className="user-section">
                        <span className="user-welcome">Welcome, Prof. <strong>{currentUser.name}</strong></span>
                        {/* ✅ 5. The logout button now works correctly */}
                        <button className="btn btn-logout" onClick={handleLogout}><LogOut size={16} /> Logout</button>
                    </div>
                </div>
            </header>

            <nav className="nav">
                <div className="nav-tabs">
                    <button onClick={() => setActiveTab('raise-ticket')} className={`nav-tab ${activeTab === 'raise-ticket' ? 'active' : ''}`}>
                        <Plus size={16} /> Raise Ticket
                    </button>
                    <button onClick={() => setActiveTab('view-tickets')} className={`nav-tab ${activeTab === 'view-tickets' ? 'active' : ''}`}>
                        <Eye size={16} /> View Tickets ({tickets.length})
                    </button>
                </div>
            </nav>

            <main className="main">
                {isLoading ? (
                    <div className="loading-state">Loading Dashboard...</div>
                ) : error ? (
                    <div className="error-state">{error}</div>
                ) : activeTab === 'raise-ticket' ? (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Raise New Ticket</h2>
                            <p className="card-subtitle">Submit a request to an administrator</p>
                        </div>
                        <form onSubmit={handleSubmit} className="card-content">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Department *</label>
                                    <select name="department" value={formData.department} onChange={handleInputChange} required className="form-input">
                                        <option value="">Select Department</option>
                                        <option value="CSE">Computer Science Engineering (CSE)</option>
                                        <option value="ECE">Electronics and Communication Engineering (ECE)</option>
                                        <option value="CSIT">Computer Science and Information Technology (CSIT)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        {formData.department ? `Send Request To (${formData.department} HOD)` : 'Recipient (HOD)'}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.department ? 
                                            (admins.find(admin => admin.branch === formData.department)?.name || 'Loading...') : 
                                            'Please select department first'
                                        } 
                                        disabled 
                                        className="form-input disabled-input"
                                        style={{ backgroundColor: '#f8f9fa', color: '#6c757d' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Subject *</label>
                                    <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} required className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">From Campus *</label>
                                    <select name="fromCampus" value={formData.fromCampus} onChange={handleInputChange} required className="form-input">
                                        <option value="">Select Campus</option>
                                        <option value="Main Block">Main Block</option>
                                        <option value="Kanchan">Kanchan</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">To Campus *</label>
                                    <select name="toCampus" value={formData.toCampus} onChange={handleInputChange} required className="form-input">
                                        <option value="">Select Campus</option>
                                        <option value="Main Block">Main Block</option>
                                        <option value="Kanchan">Kanchan</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date *</label>
                                    <input type="date" name="date" value={formData.date} min={new Date().toISOString().split('T')[0]} onChange={handleInputChange} required className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Time *</label>
                                    <input type="time" name="time" value={formData.time} onChange={handleInputChange} required className="form-input" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" className="form-input" placeholder="Provide details..."></textarea>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    <Send size={16} /> {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Your Submitted Tickets</h2>
                            <p className="card-subtitle">Track your requests</p>
                        </div>
                        <div className="ticket-list">
                            {tickets.length === 0 ? (
                                <div className="empty-state"><p>No tickets found.</p></div>
                            ) : (
                                tickets.map((ticket) => (
                                    <div key={ticket.id} className="ticket-item">
                                        <div className="ticket-header">
                                            <span className="ticket-number">#{`BMS${String(ticket.id).padStart(6, '0')}`}</span>
                                            <span className={`status-badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
                                        </div>
                                        <h3 className="ticket-subject">{ticket.subject}</h3>
                                        <div className="ticket-details">
                                            <div><strong>To:</strong> {ticket.recipient_name || 'N/A'}</div>
                                            <div><strong>Route:</strong> {ticket.from_campus} → {ticket.to_campus}</div>
                                            <div><strong>Date:</strong> {new Date(ticket.request_date).toLocaleDateString()}</div>
                                            <div><strong>Time:</strong> {ticket.request_time}</div>
                                        </div>
                                        <div className="ticket-timestamp">
                                            Created: {new Date(ticket.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default FacultyDashboard;