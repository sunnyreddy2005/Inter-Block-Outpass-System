import React, { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import * as ticketService from './services/ticketService';
import { toast } from 'react-toastify';
import { Clock, Send, Eye, Plus, LogOut, FileText, RefreshCw, User, Camera, Edit2, Save, X } from 'lucide-react';
import './StudentDashBoard.css';

// =======================================================================
// FEATURE: OTP Countdown Timer Component
// =======================================================================
const OtpTimer = ({ expiryTimestamp }) => {
    const calculateRemainingTime = useCallback(() => {
        const now = new Date();
        const expiry = new Date(expiryTimestamp);
        const difference = expiry.getTime() - now.getTime();
        return Math.max(0, difference);
    }, [expiryTimestamp]);

    const [remainingTime, setRemainingTime] = useState(calculateRemainingTime);

    useEffect(() => {
        if (remainingTime <= 0) return;

        const timer = setInterval(() => {
            setRemainingTime(calculateRemainingTime());
        }, 1000);

        return () => clearInterval(timer);
    }, [remainingTime, calculateRemainingTime]);

    const minutes = String(Math.floor((remainingTime / 1000 / 60) % 60)).padStart(2, '0');
    const seconds = String(Math.floor((remainingTime / 1000) % 60)).padStart(2, '0');

    return (
        <span className="otp-timer">
            (Expires in: {minutes}:{seconds})
        </span>
    );
};

// =======================================================================
// FEATURE: Branch Detection Logic
// =======================================================================
const getBranchFromEmail = (email) => {
    if (!email || !email.includes('@')) return null;
    const regNumber = email.split('@')[0];
    const sixthDigit = regNumber.charAt(5);
    const branchMap = { '3': 'CSE', '4': 'ECE', '9': 'CSIT' };
    return branchMap[sixthDigit] || null;
};

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();

    const [activeTab, setActiveTab] = useState('raise-ticket');
    const [tickets, setTickets] = useState([]);
    const [otpLoading, setOtpLoading] = useState({}); // { [ticketId]: boolean }
    const [admins, setAdmins] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        subject: '',
        adminId: '',
        department: '', // Add department field
        travelType: '', // New field: Outblock or Interblock
        fromCampus: '',
        toCampus: '',
        date: new Date(), // Use Date object for react-datepicker
        time: '',
        description: ''
    });

    // Profile management state
    const [profileData, setProfileData] = useState({
        name: '',
        studentId: '',
        email: '',
        profilePhoto: null
    });
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);

    const loadData = useCallback(async () => {
        if (!currentUser?.id) return;
        setIsLoading(true);
        setError(null);
        try {
            // Load all admins for department selection
            const adminsData = await ticketService.fetchAdmins("All");
            const ticketsData = await ticketService.fetchTicketsByStudent(currentUser.id);
            setAdmins(adminsData);
            setTickets(ticketsData);
        } catch (err) {
            console.error("Failed to load dashboard data:", err);
            setError("Could not load data. Please refresh the page.");
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) navigate('/login');
        else {
            loadData();
            // Initialize profile data from currentUser
            setProfileData({
                name: currentUser.name || '',
                studentId: currentUser.email ? currentUser.email.split('@')[0] : '',
                email: currentUser.email || '',
                profilePhoto: currentUser.profilePhoto || null
            });
            if (currentUser.profilePhoto) {
                setProfilePhotoPreview(currentUser.profilePhoto);
            }
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

    // For react-datepicker
    const handleDateChange = (date) => {
        setFormData(prev => ({ ...prev, date }));
    };

    // Profile management functions
    const handleProfileInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleProfilePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please select a valid image file.');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size should be less than 5MB.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfilePhotoPreview(e.target.result);
                setProfileData(prev => ({ ...prev, profilePhoto: e.target.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        try {
            // Here you would typically save to your backend
            // For now, we'll just show success and update local state
            toast.success('Profile updated successfully!');
            setIsEditingProfile(false);
            
            // TODO: Implement actual API call to save profile data
            // const response = await fetch('/api/students/profile', {
            //     method: 'PUT',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(profileData)
            // });
        } catch (error) {
            toast.error('Failed to update profile. Please try again.');
        }
    };

    const handleCancelEdit = () => {
        // Reset to original data
        setProfileData({
            name: currentUser.name || '',
            studentId: currentUser.email ? currentUser.email.split('@')[0] : '',
            email: currentUser.email || '',
            profilePhoto: currentUser.profilePhoto || null
        });
        setProfilePhotoPreview(currentUser.profilePhoto || null);
        setIsEditingProfile(false);
    };

    // --- OTP GENERATION LOGIC ---
    const handleGenerateOtp = async (ticket) => {
        setOtpLoading(prev => ({ ...prev, [ticket.id]: true }));
        try {
            // Call backend to generate new OTP
            const response = await fetch(`http://localhost:3001/api/tickets/${ticket.id}/generate-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const result = await response.json();
            if (!response.ok) {
                toast.error(result.error || 'Failed to generate OTP.');
            } else {
                toast.success('New OTP generated!');
                // Reload tickets to reflect new OTP
                await loadData();
            }
        } catch (err) {
            toast.error('Failed to generate OTP.');
        } finally {
            setOtpLoading(prev => ({ ...prev, [ticket.id]: false }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { subject, department, adminId, travelType, fromCampus, toCampus, date, time } = formData;
        
        // Enhanced validation with clear error messages
        if (!subject.trim()) {
            toast.warn('Please enter a subject for your request.');
            return;
        }
        if (!department) {
            toast.warn('Please select a department.');
            return;
        }
        if (!adminId) {
            toast.warn('No HOD found for the selected department. Please contact support.');
            return;
        }
        if (!travelType) {
            toast.warn('Please select whether this is an OutPass or Interblock request.');
            return;
        }
        if (!date) {
            toast.warn('Please select the date for your travel.');
            return;
        }
        if (!time) {
            toast.warn('Please select the time for your travel.');
            return;
        }
        if (travelType === 'Interblock' && (!fromCampus || !toCampus)) {
            toast.warn('For Interblock travel, please select both departure and destination campus.');
            return;
        }
        if (travelType === 'Interblock' && fromCampus === toCampus) {
            toast.warn('Departure and destination campus cannot be the same.');
            return;
        }
        
        setIsSubmitting(true);
        try {
            const ticketPayload = {
                creator_id: currentUser.id,
                creator_role: currentUser.role,
                admin_id: parseInt(adminId, 10),
                department: department,
                subject: subject.trim(),
                description: formData.description.trim(),
                travel_type: travelType,
                from_campus: travelType === 'Interblock' ? fromCampus : '',
                to_campus: travelType === 'Interblock' ? toCampus : '',
                request_date: date instanceof Date ? date.toISOString().split('T')[0] : date,
                request_time: time,
                email: currentUser.email
            };
            const newTicketFromServer = await ticketService.submitTicket(ticketPayload);
            toast.success('Your request has been submitted successfully to the ' + department + ' HOD!');
            setTickets(prevTickets => [newTicketFromServer, ...prevTickets]);
            setFormData({
                subject: '', department: '', adminId: '', travelType: '', fromCampus: '', toCampus: '',
                date: new Date(), time: '', description: ''
            });
            setActiveTab('view-tickets');
        } catch (err) {
            console.error("Failed to submit ticket:", err);
            toast.error('Failed to submit your request. Please check your information and try again.');
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

    if (!currentUser) return <div>Loading...</div>;

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
                             <h1 className="logo-text">Student Dashboard</h1>
                         </div>
                     </div>
                     <div className="user-section">
                         <div className="user-info">
                             <span className="user-welcome">Welcome </span>
                             <span className="user-id">{currentUser.email ? currentUser.email.split('@')[0] : 'N/A'}</span>
                         </div>
                         <button 
                             className="btn btn-profile" 
                             onClick={() => setActiveTab('profile')}
                             title="View Profile"
                         >
                             <User size={16} /> Profile
                         </button>
                         <button className="btn btn-logout" onClick={handleLogout}><LogOut size={16} /> Logout</button>
                     </div>
                 </div>
            </header>
            <nav className="nav">
                <div className="nav-tabs">
                    <button onClick={() => setActiveTab('raise-ticket')} className={`nav-tab ${activeTab === 'raise-ticket' ? 'active' : ''}`}>
                        <Plus size={16} /> Submit New Request
                    </button>
                    <button onClick={() => setActiveTab('view-tickets')} className={`nav-tab ${activeTab === 'view-tickets' ? 'active' : ''}`}>
                        <Eye size={16} /> My Requests ({tickets.length})
                    </button>
                </div>
            </nav>
            <main className="main">
                 {isLoading ? (
                     <div className="loading-state">Loading Dashboard...</div>
                 ) : error ? (
                     <div className="error-state">{error}</div>
                 ) : activeTab === 'profile' ? (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Student Profile</h2>
                            <p className="card-subtitle">Manage your profile information and photo</p>
                        </div>
                        <div className="card-content">
                            <div className="profile-container">
                                {/* Profile Photo Section */}
                                <div className="profile-photo-section">
                                    <div className="profile-photo-container">
                                        {profilePhotoPreview ? (
                                            <img 
                                                src={profilePhotoPreview} 
                                                alt="Profile" 
                                                className="profile-photo"
                                            />
                                        ) : (
                                            <div className="profile-photo-placeholder">
                                                <User size={60} />
                                            </div>
                                        )}
                                        {isEditingProfile && (
                                            <div className="photo-upload-overlay">
                                                <label htmlFor="profilePhotoInput" className="photo-upload-btn">
                                                    <Camera size={20} />
                                                    Change Photo
                                                </label>
                                                <input
                                                    id="profilePhotoInput"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleProfilePhotoChange}
                                                    style={{ display: 'none' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Profile Information */}
                                <div className="profile-info-section">
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label">Student Name</label>
                                            {isEditingProfile ? (
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={profileData.name}
                                                    onChange={handleProfileInputChange}
                                                    className="form-input"
                                                    placeholder="Enter your full name"
                                                />
                                            ) : (
                                                <div className="profile-display-field">{profileData.name || 'Not set'}</div>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Student ID</label>
                                            {isEditingProfile ? (
                                                <input
                                                    type="text"
                                                    name="studentId"
                                                    value={profileData.studentId}
                                                    onChange={handleProfileInputChange}
                                                    className="form-input"
                                                    placeholder="Enter your student ID"
                                                />
                                            ) : (
                                                <div className="profile-display-field">{profileData.studentId || 'Not set'}</div>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Email Address</label>
                                            {isEditingProfile ? (
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={profileData.email}
                                                    onChange={handleProfileInputChange}
                                                    className="form-input"
                                                    placeholder="Enter your email address"
                                                />
                                            ) : (
                                                <div className="profile-display-field">{profileData.email || 'Not set'}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="profile-actions">
                                        {isEditingProfile ? (
                                            <div className="edit-actions">
                                                <button 
                                                    type="button" 
                                                    className="btn btn-primary" 
                                                    onClick={handleSaveProfile}
                                                >
                                                    <Save size={16} /> Save Changes
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-secondary" 
                                                    onClick={handleCancelEdit}
                                                >
                                                    <X size={16} /> Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                type="button" 
                                                className="btn btn-primary" 
                                                onClick={() => setIsEditingProfile(true)}
                                            >
                                                <Edit2 size={16} /> Edit Profile
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 ) : activeTab === 'raise-ticket' ? (
                        <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Submit New Request</h2>
                            <p className="card-subtitle">Fill out the form below to request permission</p>
                        </div>
                        <form onSubmit={handleSubmit} className="card-content">
                           <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <select name="department" value={formData.department} onChange={handleInputChange} required className="form-input">
                                        <option value="">-- Please Select Department --</option>
                                        <option value="CSE">Computer Science Engineering (CSE)</option>
                                        <option value="ECE">Electronics and Communication Engineering (ECE)</option>
                                        <option value="CSIT">Computer Science and Information Technology (CSIT)</option>
                                    </select>
                                </div>
                                
                                {formData.department && formData.adminId && (
                                    <div className="form-group">
                                        <label className="form-label">Request will be sent to</label>
                                        <div className="hod-display">
                                            {(() => {
                                                const selectedAdmin = admins.find(admin => admin.id == formData.adminId);
                                                return selectedAdmin ? 
                                                    `${selectedAdmin.name} - ${selectedAdmin.department} HOD (${selectedAdmin.email})` : 
                                                    `${formData.department} HOD`;
                                            })()}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="form-group">
                                    <label className="form-label">Subject / Reason for Request</label>
                                    <input 
                                        type="text" 
                                        name="subject" 
                                        value={formData.subject} 
                                        onChange={handleInputChange} 
                                        required 
                                        className="form-input"
                                        placeholder="e.g., Medical appointment, Family visit, etc."
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type of Permission</label>
                                    <select name="travelType" value={formData.travelType} onChange={handleInputChange} required className="form-input">
                                        <option value="">-- Please Select Type --</option>
                                        <option value="Outblock">OutPass (Leave campus for external visit)</option>
                                        <option value="Interblock">Interblock (Travel between campus locations)</option>
                                    </select>
                                </div>
                                {formData.travelType === 'Interblock' && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Departing From (Campus)</label>
                                            <select name="fromCampus" value={formData.fromCampus} onChange={handleInputChange} required className="form-input">
                                                <option value="">-- Select Departure Campus --</option>
                                                <option value="Main Block" disabled={formData.toCampus === 'Main Block'}>Main Block Campus</option>
                                                <option value="Kanchan" disabled={formData.toCampus === 'Kanchan'}>Kanchan Block Campus</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Going To (Campus)</label>
                                            <select name="toCampus" value={formData.toCampus} onChange={handleInputChange} required className="form-input">
                                                <option value="">-- Select Destination Campus --</option>
                                                <option value="Main Block" disabled={formData.fromCampus === 'Main Block'}>Main Block Campus</option>
                                                <option value="Kanchan" disabled={formData.fromCampus === 'Kanchan'}>Kanchan BlockCampus</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <DatePicker
                                        selected={formData.date}
                                        onChange={handleDateChange}
                                        minDate={new Date()}
                                        dateFormat="yyyy-MM-dd"
                                        className="form-input"
                                        required
                                        placeholderText="Select travel date"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Time</label>
                                    <input 
                                        type="time" 
                                        name="time" 
                                        value={formData.time} 
                                        onChange={handleInputChange} 
                                        required 
                                        className="form-input"
                                    />
                                </div>
                           </div>
                            <div className="form-group">
                                <label className="form-label">Additional Details (Optional)</label>
                                <textarea 
                                    name="description" 
                                    value={formData.description} 
                                    onChange={handleInputChange} 
                                    rows="4" 
                                    className="form-input form-textarea" 
                                    placeholder="Please provide any additional information about your travel request..."
                                ></textarea>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting || admins.length === 0}>
                                    <Send size={16} /> {isSubmitting ? 'Submitting Your Request...' : 'Submit Request'}
                                </button>
                                {admins.length === 0 && (
                                    <p style={{ color: '#dc2626', marginTop: '1rem', textAlign: 'center' }}>
                                        No administrators are available for your branch. Please contact support.
                                    </p>
                                )}
                            </div>
                        </form>
                    </div>
                 ) : (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">My Travel Requests</h2>
                            <p className="card-subtitle">View the status of your submitted requests and access approval codes</p>
                        </div>
                        <div className="ticket-list">
                            {tickets.length === 0 ? (
                                <div className="empty-state">
                                    <p>You haven't submitted any travel requests yet.</p>
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                                        Click "Submit New Request" to create your first travel request.
                                    </p>
                                </div>
                            ) : (
                                tickets.map((ticket) => {
                                    const now = new Date();
                                    const otpExpiry = ticket.otp_expires_at ? new Date(ticket.otp_expires_at) : null;
                                    const isExpired = otpExpiry && otpExpiry < now;
                                    const isCollected = ticket.status === 'Collected';
                                    const isApproved = ticket.status === 'Approved';
                                    const hasOtp = !!ticket.otp;
                                    // Only allow new OTP if: ticket is approved, (no OTP, or expired, or collected)
                                    const canGenerateOtp = isApproved && (!hasOtp || isExpired || isCollected);
                                    // Only allow one OTP per day: check if otp_expires_at is today
                                    let otpGeneratedToday = false;
                                    if (otpExpiry) {
                                        const today = now.toISOString().slice(0, 10);
                                        const otpDay = otpExpiry.toISOString().slice(0, 10);
                                        otpGeneratedToday = today === otpDay;
                                    }

                                    let otpStatus = 'No OTP';
                                    if (isCollected) {
                                        otpStatus = 'Accepted';
                                    } else if (isApproved && hasOtp && !isExpired) {
                                        otpStatus = 'OTP Generated';
                                    } else if (isApproved && hasOtp && isExpired) {
                                        otpStatus = 'Expired';
                                    }

                                    return (
                                        <div key={ticket.id} className="ticket-item">
                                            <div className="ticket-header">
                                                <span className="ticket-number">#{`BMS${String(ticket.id).padStart(6, '0')}`}</span>
                                                <span className={`status-badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
                                            </div>
                                            <h3 className="ticket-subject">{ticket.subject}</h3>

                                            <div className="otp-section" style={{ marginBottom: '0.5rem' }}>
                                                <strong>OTP Status:</strong> {otpStatus}
                                                {/* Show OTP only if not used/collected */}
                                                {isApproved && hasOtp && !isExpired && !isCollected && (
                                                    <>
                                                        <span className="otp-code" style={{ marginLeft: 8 }}>{ticket.otp}</span>
                                                        <OtpTimer expiryTimestamp={ticket.otp_expires_at} />
                                                    </>
                                                )}
                                                {/* Show nothing if collected (used) */}
                                                {isCollected && (
                                                    <span style={{ marginLeft: 8, color: '#10b981', fontWeight: 500 }}>
                                                        (OTP Accepted by VO)
                                                    </span>
                                                )}
                                                {canGenerateOtp && !otpGeneratedToday && (
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ marginLeft: 12, fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
                                                        onClick={() => handleGenerateOtp(ticket)}
                                                        disabled={otpLoading[ticket.id]}
                                                    >
                                                        <RefreshCw size={14} style={{ marginRight: 4 }} />
                                                        {otpLoading[ticket.id] ? 'Generating...' : 'Generate OTP'}
                                                    </button>
                                                )}
                                                {canGenerateOtp && otpGeneratedToday && (
                                                    <span style={{ marginLeft: 12, color: '#f59e42', fontSize: '0.8rem' }}>
                                                        (Daily limit reached)
                                                    </span>
                                                )}
                                            </div>

                                            <div className="ticket-details">
                                                <div><strong>To:</strong> {ticket.recipient_name || 'N/A'}</div>
                                                {ticket.travel_type === 'Interblock' && (
                                                    <div><strong>Route:</strong> {ticket.from_campus} → {ticket.to_campus}</div>
                                                )}
                                                {ticket.travel_type === 'Outblock' && (
                                                    <div><strong>Type:</strong> OutPass</div>
                                                )}
                                                <div><strong>Date:</strong> {new Date(ticket.request_date).toLocaleDateString()}</div>
                                                <div><strong>Time:</strong> {ticket.request_time}</div>
                                            </div>
                                            <div className="ticket-timestamp">
                                                Created: {new Date(ticket.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                 )}
            </main>
        </div>
    );
};

export default StudentDashboard;
