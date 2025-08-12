// src/pages/AdminDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; 
import * as ticketService from './services/ticketService';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, User, Mail, LogOut, FileText, Key } from 'lucide-react';
import ChangePassword from './ChangePassword';
import './StudentDashBoard.css';
import './ChangePassword.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();

    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showChangePassword, setShowChangePassword] = useState(false);

    const loadTickets = useCallback(async () => {
        if (!currentUser?.id) return;

        setIsLoading(true);
        setError(null);
        try {
            const assignedTickets = await ticketService.fetchTicketsByAdmin(currentUser.id);
            setTickets(assignedTickets);
        } catch (err) {
            console.error(err);
            setError("Failed to load tickets. Please try refreshing.");
            toast.error("Failed to load tickets.");
        } finally {
            setIsLoading(false);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
        } else {
            loadTickets();
        }
    }, [currentUser, loadTickets, navigate]);

    // ✅ THIS IS THE CORRECTED FUNCTION
    const handleUpdateStatus = async (ticketId, newStatus) => {
        try {
            // 1. The service function now returns the fully updated ticket from the DB,
            // including the new OTP if one was generated.
            const updatedTicketFromServer = await ticketService.updateTicketStatus(ticketId, newStatus);
            
            // 2. We use this complete, fresh data to update the UI instantly.
            setTickets(prevTickets =>
                prevTickets.map(ticket =>
                    ticket.id === ticketId ? updatedTicketFromServer : ticket
                )
            );
            toast.success(`Ticket has been ${newStatus}.`);
        } catch (err) {
            console.error(err);
            toast.error(`Failed to update ticket: ${err.message}`);
        }
    };

    // This function correctly calls the logout method from our AuthContext
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
                    <div className="logo-section">
                        <div className="klh-logo-container">
                            <img src="/klhlogo.png" alt="KLH University" className="klh-header-logo" />
                        </div>
                        <div className="app-logo">
                            <img src="/logo.png" alt="App Logo" className="app-header-logo" />
                            <h1 className="logo-text">Admin Dashboard</h1>
                        </div>
                    </div>
                    <div className="user-section">
                        <div className="user-info">
                            <span className="user-welcome">Welcome, <strong>{currentUser.name}</strong></span>
                            <span className="user-id">{currentUser.email}</span>
                        </div>
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setShowChangePassword(true)}
                            title="Change Password"
                        >
                            <Key size={16} /> Change Password
                        </button>
                        <button className="btn btn-logout" onClick={handleLogout}>
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </header>
            
            <main className="main">
                <div className="container">
                    <div className="dashboard-content">
                        <div className="card">
                            <div className="card-header">
                                <h2 className="card-title">
                                    <FileText size={24} />
                                    Incoming Requests
                                </h2>
                                <p className="card-subtitle">Review and process tickets assigned to your department.</p>
                            </div>
                            <div className="card-content">
                                {isLoading ? (
                                    <div className="loading-state">
                                        <div className="loader"></div>
                                        <p>Loading tickets...</p>
                                    </div>
                                ) : error ? (
                                    <div className="error-state">
                                        <p>{error}</p>
                                        <button className="btn btn-primary" onClick={loadTickets}>
                                            Try Again
                                        </button>
                                    </div>
                                ) : tickets.length === 0 ? (
                                    <div className="empty-state">
                                        <FileText size={48} />
                                        <h3>No Tickets Found</h3>
                                        <p>No tickets are currently assigned to your department.</p>
                                    </div>
                                ) : (
                                    <div className="ticket-list">
                                        {tickets.map(ticket => (
                                            <div key={ticket.id} className="ticket-item">
                                                <div className="ticket-header">
                                                    <div className="ticket-meta">
                                                        <span className="ticket-number">#{`BMS${String(ticket.id).padStart(6, '0')}`}</span>
                                                        <span className={`status-badge ${getStatusClass(ticket.status)}`}>
                                                            {ticket.status}
                                                        </span>
                                                    </div>
                                                    <div className="ticket-student-info">
                                                        <span><User size={14}/> {ticket.student_name}</span>
                                                        <span><Mail size={14}/> {ticket.student_email}</span>
                                                    </div>
                                                </div>
                                                
                                                <h3 className="ticket-subject">{ticket.subject}</h3>
                                                {ticket.description && (
                                                    <p className="ticket-description">{ticket.description}</p>
                                                )}
                                                
                                                <div className="ticket-details">
                                                    <div><strong>Route:</strong> {ticket.from_campus} → {ticket.to_campus}</div>
                                                    <div><strong>Date:</strong> {new Date(ticket.request_date).toLocaleDateString()}</div>
                                                    <div><strong>Time:</strong> {ticket.request_time}</div>
                                                </div>
                                                
                                                {ticket.status === 'Pending' && (
                                                    <div className="ticket-actions">
                                                        <button 
                                                            onClick={() => handleUpdateStatus(ticket.id, 'Approved')} 
                                                            className="btn btn-approve"
                                                        >
                                                            <CheckCircle size={16} /> Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(ticket.id, 'Rejected')} 
                                                            className="btn btn-reject"
                                                        >
                                                            <XCircle size={16} /> Reject
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                <div className="ticket-timestamp">
                                                    Received: {new Date(ticket.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Change Password Modal */}
            {showChangePassword && (
                <ChangePassword onClose={() => setShowChangePassword(false)} />
            )}
        </div>
    );
};

export default AdminDashboard;
