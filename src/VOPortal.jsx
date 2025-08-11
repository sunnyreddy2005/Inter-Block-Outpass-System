import React, { useState } from 'react';
import { Shield, Search, LogOut, FileText, User, Mail, CheckCircle, XCircle, Calendar, Clock, MapPin } from 'lucide-react';

const VODashboard = () => {
    const [otpInput, setOtpInput] = useState('');
    const [emailInput, setEmailInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);

    // Mock current user - replace with actual auth context
    const currentUser = { name: 'VO Officer', id: 1 };

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
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            {/* Header */}
            <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '1rem 0' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Shield size={20} />
                        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>VO Dashboard</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span>Welcome, <strong>{currentUser.name}</strong></span>
                        <button 
                            onClick={handleLogout}
                            style={{ 
                                background: '#ef4444', 
                                color: 'white', 
                                border: 'none', 
                                padding: '0.5rem 1rem', 
                                borderRadius: '0.375rem', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
                {/* Verification Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e5e7eb' }}>
                        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>OTP Verification</h2>
                        <p style={{ margin: 0, color: '#6b7280' }}>Verify student/faculty OTP for approved tickets</p>
                    </div>
                    
                    <form onSubmit={handleVerifyOtp} style={{ padding: '2rem' }}>
                        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                    Email Address (from ticket) *
                                </label>
                                <input
                                    type="email"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder="Enter the email from the ticket"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.375rem',
                                        fontSize: '1rem',
                                        boxSizing: 'border-box'
                                    }}
                                    disabled={isVerifying}
                                    required
                                />
                            </div>
                            
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                    6-Digit OTP *
                                </label>
                                <input
                                    type="text"
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="Enter 6-digit OTP"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.375rem',
                                        fontSize: '1.2rem',
                                        textAlign: 'center',
                                        letterSpacing: '0.2em',
                                        fontFamily: 'Courier New, monospace',
                                        boxSizing: 'border-box'
                                    }}
                                    disabled={isVerifying}
                                    maxLength="6"
                                    required
                                />
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button 
                                    type="submit"
                                    style={{
                                        backgroundColor: !emailInput.trim() || !otpInput.trim() || isVerifying ? '#9ca3af' : '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '0.375rem',
                                        cursor: !emailInput.trim() || !otpInput.trim() || isVerifying ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.9rem',
                                        fontWeight: '500'
                                    }}
                                    disabled={isVerifying || !emailInput.trim() || !otpInput.trim()}
                                >
                                    <Search size={16} />
                                    {isVerifying ? 'Verifying...' : 'Verify OTP'}
                                </button>
                                
                                {verificationResult && (
                                    <button 
                                        type="button"
                                        onClick={clearResult}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '0.375rem',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        Clear Result
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                        
                    {/* Verification Result */}
                    {verificationResult && (
                        <div style={{
                            margin: '0 2rem 2rem 2rem',
                            padding: '1.5rem',
                            borderRadius: '0.5rem',
                            border: '2px solid',
                            borderColor: verificationResult.success ? '#10b981' : '#ef4444',
                            backgroundColor: verificationResult.success ? '#f0fdf4' : '#fef2f2'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                {verificationResult.success ? (
                                    <CheckCircle size={24} style={{ color: '#10b981' }} />
                                ) : (
                                    <XCircle size={24} style={{ color: '#ef4444' }} />
                                )}
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: verificationResult.success ? '#065f46' : '#991b1b' }}>
                                    {verificationResult.success ? '✅ Entry Approved - Allow Access' : '❌ Entry Denied'}
                                </h3>
                            </div>
                            
                            <p style={{ margin: '0.5rem 0 1rem 0', fontWeight: '500', color: verificationResult.success ? '#065f46' : '#991b1b' }}>
                                {verificationResult.message}
                            </p>
                            
                            {verificationResult.success && verificationResult.creatorDetails && (
                                <div>
                                    {/* User Details */}
                                    <div style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                        padding: '1rem',
                                        borderRadius: '0.375rem',
                                        marginBottom: '1rem'
                                    }}>
                                        <h4 style={{ margin: '0 0 0.75rem 0', color: '#374151' }}>Verified User Details:</h4>
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <User size={16} />
                                                <span><strong>Name:</strong> {verificationResult.creatorDetails.name}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Mail size={16} />
                                                <span><strong>Email:</strong> {verificationResult.creatorDetails.email}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <FileText size={16} />
                                                <span><strong>Roll/ID:</strong> {verificationResult.creatorDetails.roll_number}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <User size={16} />
                                                <span><strong>Role:</strong> {verificationResult.creatorDetails.role}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ticket Details */}
                                    {verificationResult.ticketDetails && (
                                        <div style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                            padding: '1rem',
                                            borderRadius: '0.375rem'
                                        }}>
                                            <h4 style={{ margin: '0 0 0.75rem 0', color: '#374151' }}>Travel Request Details:</h4>
                                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <FileText size={16} />
                                                    <span><strong>Subject:</strong> {verificationResult.ticketDetails.subject}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                    <MapPin size={16} style={{ marginTop: '0.1rem' }} />
                                                    <span><strong>Route:</strong> {verificationResult.ticketDetails.from_campus} → {verificationResult.ticketDetails.to_campus}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Calendar size={16} />
                                                    <span><strong>Date:</strong> {formatDate(verificationResult.ticketDetails.request_date)}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                
                {/* Instructions Card */}
                <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.75rem', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
                    overflow: 'hidden',
                    marginTop: '2rem'
                }}>
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e5e7eb' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>How to Verify Entry</h3>
                    </div>
                    <div style={{ padding: '2rem' }}>
                        <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.6', color: '#374151' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Ask the person to show you their approved ticket with OTP on their device</li>
                            <li style={{ marginBottom: '0.5rem' }}>Copy the email address exactly as shown in their ticket</li>
                            <li style={{ marginBottom: '0.5rem' }}>Ask them to tell you the 6-digit OTP number</li>
                            <li style={{ marginBottom: '0.5rem' }}>Enter both values in the form above and click "Verify OTP"</li>
                            <li style={{ marginBottom: '0.5rem', color: '#16a34a', fontWeight: '600' }}>✅ <strong>Green Result:</strong> Valid ticket - Allow entry and note down their details</li>
                            <li style={{ color: '#dc2626', fontWeight: '600' }}>❌ <strong>Red Result:</strong> Invalid/expired/used ticket - Deny entry</li>
                        </ol>
                        
                        <div style={{ 
                            marginTop: '1.5rem', 
                            padding: '1rem', 
                            backgroundColor: '#fef3c7', 
                            borderRadius: '0.375rem',
                            borderLeft: '4px solid #f59e0b'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>
                                <strong>Note:</strong> Each OTP can only be used once. After successful verification, 
                                the system automatically marks the OTP as used and cannot be verified again.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VODashboard;