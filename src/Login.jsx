import React, {useState} from 'react';
import './Login.css';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleLogin = async () => {
        if (loading) return; // Prevent multiple submits
        const email = formData.email.trim();
        const password = formData.password;

        if (!email || !password) {
            setError('Both fields are required');
            return;
        }

        setLoading(true);
        setError('');
        console.log(`Attempting login for email: ${email}`);

        const tables = ['admins', 'students', 'faculty', 'vo_officers'];

        for (let table of tables) {
            try {
                console.log(`Checking table: ${table}...`);
                const { data, error: queryError } = await supabase
                    .from(table)
                    .select('id, name, email, password')
                    .eq('email', email)
                    .single();

                // ✅ ADDED FOR DEBUGGING: See what Supabase returns
                console.log(`Response from ${table}:`, { data, queryError });

                if (queryError && queryError.code !== 'PGRST116') {
                    // PGRST116 means "exact one row not found", which is expected.
                    // We only log other, unexpected errors.
                    console.error(`Supabase error on table ${table}:`, queryError);
                }

                if (data) {
                    console.log(`User found in ${table}. Checking password...`);
                    // Do not log the password for security
                    if (data.password === password) {
                        console.log('Password MATCHES.');
                        const role = table === 'admins' ? 'admin' : (table === 'students' ? 'student' : (table === 'faculty' ? 'faculty' : 'vo'));

                        const userData = {
                            id: data.id,
                            name: data.name,
                            email: data.email,
                            role: role,
                        };

                        console.log('Login successful. Saving this user to context:', userData);
                        login(userData);
                        setLoading(false); // Reset loading after successful login

                        if (role === 'admin') {
                            navigate('/admin-dashboard');
                        } else if (role === 'student') {
                            navigate('/student-dashboard');
                        } else if (role === 'faculty') {
                            navigate('/faculty-dashboard');
                        } else if (role === 'vo') {
                            navigate('/vo-portal');
                        }
                        return;
                    } else {
                        console.log('Password DOES NOT MATCH.');
                    }
                }
            } catch (err) {
                // This catch block might not be necessary if we handle queryError, but we'll keep it for safety.
                console.error(`An unexpected error occurred while checking table ${table}:`, err);
            }
        }

        // If the loop finishes without finding a user
        console.log('User not found in any table or password incorrect.');
        setLoading(false);
        setError('Invalid email or password');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="form-container">
                    <div className="header">
                        <img src="/logo.png" alt="University Logo" className="header-logo" />
                    </div>

                    <div className="form-group">
                        <label>Registration Number / Email</label>
                        <input
                            type="text"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter your registration number or email"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter your password"
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="error">{error}</div>}

                    <button 
                        className={`login-btn ${loading ? 'loading' : ''}`}
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? 'Signing In...' : 'Log in'}
                    </button>

                    <div className="lost-password">
                        <a href="#" onClick={(e) => e.preventDefault()}>Lost password?</a>
                    </div>

                    <div className="footer">
                        <small>© 2025 KL University Interblock Outpass Portal</small>
                    </div>
                </div>
            </div>

            <div className="welcome-section">
                <img src="/klhlogo.png" alt="KL University Logo" className="klh-logo" />
                <div className="welcome-text">
                    <h1 className="welcome-title">Welcome to Interblock Outpass System!</h1>
                    <p className="welcome-subtitle">Powered by KL (Deemed to be UNIVERSITY),</p>
                    <p className="university-name">Hyderabad.</p>
                    <p className="rights-reserved">All rights reserved.</p>
                </div>
                <button className="guest-access">Access as a guest</button>
                <div className="cookies-notice">Cookies notice</div>
            </div>
        </div>
    );
};

export default Login;
