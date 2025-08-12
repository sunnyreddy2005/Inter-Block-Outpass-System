// src/ChangePassword.jsx
import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { changePassword } from './services/ticketService';

const ChangePassword = ({ onClose }) => {
    const { currentUser, login } = useAuth();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear messages when user starts typing
        if (message) setMessage('');
        if (error) setError('');
    };

    const validateForm = () => {
        if (!formData.currentPassword) {
            setError('Current password is required');
            return false;
        }
        if (!formData.newPassword) {
            setError('New password is required');
            return false;
        }
        if (formData.newPassword.length < 6) {
            setError('New password must be at least 6 characters long');
            return false;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            setError('New passwords do not match');
            return false;
        }
        if (formData.currentPassword === formData.newPassword) {
            setError('New password must be different from current password');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            await changePassword(
                currentUser.id,
                currentUser.role,
                formData.currentPassword,
                formData.newPassword
            );

            setMessage('Password changed successfully!');
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            // Auto-close after success
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error) {
            setError(error.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content change-password-modal">
                <div className="modal-header">
                    <h2>Change Password</h2>
                    <button 
                        type="button" 
                        className="close-btn"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="change-password-form">
                    <div className="form-group">
                        <label htmlFor="currentPassword">Current Password *</label>
                        <input
                            type="password"
                            id="currentPassword"
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleChange}
                            placeholder="Enter your current password"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="newPassword">New Password *</label>
                        <input
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            placeholder="Enter new password (min 6 characters)"
                            required
                            minLength="6"
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password *</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm your new password"
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="success-message">
                            <span className="success-icon">✅</span>
                            {message}
                        </div>
                    )}

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>

                <div className="password-tips">
                    <h4>Password Requirements:</h4>
                    <ul>
                        <li>At least 6 characters long</li>
                        <li>Different from your current password</li>
                        <li>Consider using a mix of letters, numbers, and symbols</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
