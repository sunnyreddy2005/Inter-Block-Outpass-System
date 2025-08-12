import React, { useState } from 'react';
import { Shield, Search, LogOut, FileText, User, Mail, CheckCircle, XCircle, Calendar, Clock, MapPin, Key } from 'lucide-react';
import ChangePassword from './ChangePassword';
import './StudentDashBoard.css';
import './ChangePassword.css';

const VODashboard = () => {
    const [otpInput, setOtpInput] = useState('');
    const [emailInput, setEmailInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);
    const [showChangePassword, setShowChangePassword] = useState(false);

    // Mock current user - replace with actual auth context
    const currentUser = { name: 'VO Officer', id: 1, role: 'vo' };

    // Logout handler (replace with real auth logic if available)
    const handleLogout = () => {
        window.location.href = '/login'; // or use navigate('/login') if using react-router
    };

    const verifyOtp = async (email, otp) => {
        const response = await fetch('http://localhost:3001/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
        });
        
        let result;
        try {
            result = await response.json();
        } catch (e) {
            throw new Error('Server error: Could not parse response.');
        }
        
        if (!response.ok) {
            throw new Error(result.error || 'Verification failed.');
        }
        
        return result;
    };
    
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        
        if (!emailInput.trim() || !otpInput.trim()) {
            setVerificationResult({
                success: false,
                message: 'Please enter both email and OTP.'
            });
            return;
        }

        if (otpInput.trim().length !== 6) {
            setVerificationResult({
                success: false,
                message: 'OTP must be exactly 6 digits.'
            });
            return;
        }

        setIsVerifying(true);
        setVerificationResult(null);
        
        try {
            const result = await verifyOtp(emailInput, otpInput);
            setVerificationResult({
                success: true,
                message: result.message,
                creatorDetails: result.student,
                ticketDetails: result.ticket
            });
            // Clear inputs on success
            setOtpInput('');
            setEmailInput('');
        } catch (err) {
            setVerificationResult({
                success: false,
                message: err.message || 'Verification failed. Please try again.'
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const clearResult = () => {
        setVerificationResult(null);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        return timeString;
    };

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="header">
                <div className="header-content">
                    <div className="logo-section">
                        <div className="klh-logo-container">
                            <img src="/klhlogo.png" alt="KLH University" className="klh-header-logo" />
                        </div>
                        <div className="app-logo">
                            <img src="/logo.png" alt="App Logo" className="app-header-logo" />
                            <h1 className="logo-text">VO Dashboard</h1>
                        </div>
                    </div>
                    <div className="user-section">
                        <div className="user-info">
                            <span className="user-welcome">Welcome, <strong>{currentUser.name}</strong></span>
                            <span className="user-id">Vehicle Officer</span>
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

            {/* Main Content */}
            <main className="main">
                <div className="container">
                    <div className="dashboard-content">
                        {/* Verification Card */}
                        <div className="card">
                            <div className="card-header">
                                <h2 className="card-title">
                                    <Shield size={24} />
                                    OTP Verification
                                </h2>
                                <p className="card-subtitle">Verify student/faculty OTP for approved tickets</p>
                            </div>
                            
                            <div className="card-content">
                                <form onSubmit={handleVerifyOtp} className="verification-form">
                                    <div className="form-container">
                                        <div className="form-group">
                                            <label htmlFor="emailInput" className="form-label">
                                                Email Address (from ticket) *
                                            </label>
                                            <input
                                                type="email"
                                                id="emailInput"
                                                value={emailInput}
                                                onChange={(e) => setEmailInput(e.target.value)}
                                                placeholder="Enter the email from the ticket"
                                                className="form-input"
                                                disabled={isVerifying}
                                                required
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label htmlFor="otpInput" className="form-label">
                                                6-Digit OTP *
                                            </label>
                                            <input
                                                type="text"
                                                id="otpInput"
                                                value={otpInput}
                                                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                placeholder="Enter 6-digit OTP"
                                                className="form-input otp-input"
                                                disabled={isVerifying}
                                                maxLength="6"
                                                required
                                            />
                                        </div>
                                        
                                        <div className="form-actions">
                                            <button 
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={isVerifying || !emailInput.trim() || !otpInput.trim()}
                                            >
                                                <Search size={16} />
                                                {isVerifying ? 'Verifying...' : 'Verify OTP'}
                                            </button>
                                            
                                            {verificationResult && (
                                                <button 
                                                    type="button"
                                                    onClick={clearResult}
                                                    className="btn btn-secondary"
                                                >
                                                    Clear Result
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </form>
                                
                                {/* Verification Result */}
                                {verificationResult && (
                                    <div className={`verification-result ${verificationResult.success ? 'success' : 'error'}`}>
                                        <div className="result-header">
                                            {verificationResult.success ? (
                                                <CheckCircle size={24} className="success-icon" />
                                            ) : (
                                                <XCircle size={24} className="error-icon" />
                                            )}
                                            <h3 className="result-title">
                                                {verificationResult.success ? '✅ Entry Approved - Allow Access' : '❌ Entry Denied'}
                                            </h3>
                                        </div>
                                        
                                        <p className="result-message">
                                            {verificationResult.message}
                                        </p>
                                        
                                        {verificationResult.success && verificationResult.creatorDetails && (
                                            <div className="verification-details">
                                                <div className="user-details-section">
                                                    <h4>Verified User Details:</h4>
                                                    <div className="details-grid">
                                                        <div className="detail-item">
                                                            <User size={16} />
                                                            <span><strong>Name:</strong> {verificationResult.creatorDetails.name}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <Mail size={16} />
                                                            <span><strong>Email:</strong> {verificationResult.creatorDetails.email}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <FileText size={16} />
                                                            <span><strong>Roll/ID:</strong> {verificationResult.creatorDetails.roll_number}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <User size={16} />
                                                            <span><strong>Role:</strong> {verificationResult.creatorDetails.role}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Ticket Details */}
                                                {verificationResult.ticketDetails && (
                                                    <div className="ticket-details-section">
                                                        <h4>Travel Request Details:</h4>
                                                        <div className="details-grid">
                                                            <div className="detail-item">
                                                                <FileText size={16} />
                                                                <span><strong>Subject:</strong> {verificationResult.ticketDetails.subject}</span>
                                                            </div>
                                                            <div className="detail-item">
                                                                <MapPin size={16} />
                                                                <span><strong>Route:</strong> {verificationResult.ticketDetails.from_campus} → {verificationResult.ticketDetails.to_campus}</span>
                                                            </div>
                                                            <div className="detail-item">
                                                                <Calendar size={16} />
                                                                <span><strong>Date:</strong> {formatDate(verificationResult.ticketDetails.request_date)}</span>
                                                            </div>
                                                            <div className="detail-item">
                                                                <Clock size={16} />
                                                                <span><strong>Time:</strong> {formatTime(verificationResult.ticketDetails.request_time)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                
                        {/* Instructions Card */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">
                                    <Shield size={24} />
                                    How to Verify Entry
                                </h3>
                            </div>
                            <div className="card-content">
                                <ol className="instructions-list">
                                    <li>Ask the person to show you their approved ticket with OTP on their device</li>
                                    <li>Copy the email address exactly as shown in their ticket</li>
                                    <li>Ask them to tell you the 6-digit OTP number</li>
                                    <li>Enter both values in the form above and click "Verify OTP"</li>
                                    <li className="instruction-success">✅ <strong>Green Result:</strong> Valid ticket - Allow entry and note down their details</li>
                                    <li className="instruction-error">❌ <strong>Red Result:</strong> Invalid/expired/used ticket - Deny entry</li>
                                </ol>
                                
                                <div className="instruction-note">
                                    <p>
                                        <strong>Note:</strong> Each OTP can only be used once. After successful verification, 
                                        the system automatically marks the OTP as used and cannot be verified again.
                                    </p>
                                </div>
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

export default VODashboard;