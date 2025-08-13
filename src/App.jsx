import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Make sure this path is correct
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import your page components
import Login from './Login'; 
import StudentDashboard from './StudentDashboard';
import AdminDashboard from './AdminDashboard';
import FacultyDashboard from './FacultyDashboard';
import VOPortal from './VOPortal'; 
import ControllerPanel from './ControllerPanel';

// =======================================================================
// This is your reusable Security Guard component
// =======================================================================
const ProtectedRoute = ({ children, requiredRole }) => {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (currentUser.role !== requiredRole) {
        if (currentUser.role === 'admin') return <Navigate to="/admin-dashboard" />;
        if (currentUser.role === 'student') return <Navigate to="/student-dashboard" />;
        if (currentUser.role === 'faculty') return <Navigate to="/faculty-dashboard" />;
        if (currentUser.role === 'vo') return <Navigate to="/vo-portal" />;
        if (currentUser.role === 'controller') return <Navigate to="/controller-panel" />;
        return <Navigate to="/login" />;
    }

    return children;
};

// =======================================================================
// This is your main App component with all the routes
// =======================================================================
function App() {
    const { currentUser } = useAuth();

    return (
        <>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route 
                    path="/student-dashboard" 
                    element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} 
                />
                <Route 
                    path="/admin-dashboard" 
                    element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} 
                />
                <Route 
                    path="/faculty-dashboard" 
                    element={<ProtectedRoute requiredRole="faculty"><FacultyDashboard /></ProtectedRoute>} 
                />
                
                {/* ✅ 2. ADDED the new secure route for the VO Portal */}
                <Route 
                    path="/vo-portal" 
                    element={<ProtectedRoute requiredRole="vo"><VOPortal /></ProtectedRoute>} 
                />

                {/* ✅ 3. ADDED the new secure route for the Controller Panel */}
                <Route 
                    path="/controller-panel" 
                    element={<ProtectedRoute requiredRole="controller"><ControllerPanel /></ProtectedRoute>} 
                />

                {/* Default Route Logic */}
                <Route 
                    path="/" 
                    element={
                        !currentUser ? <Navigate to="/login" /> :
                        currentUser.role === 'admin' ? <Navigate to="/admin-dashboard" /> :
                        currentUser.role === 'student' ? <Navigate to="/student-dashboard" /> :
                        currentUser.role === 'faculty' ? <Navigate to="/faculty-dashboard" /> :
                        currentUser.role === 'vo' ? <Navigate to="/vo-portal" /> :
                        currentUser.role === 'controller' ? <Navigate to="/controller-panel" /> :
                        <Navigate to="/login" />
                    } 
                />

                {/* Catch-all for any other path */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            
            {/* Toast Container for notifications */}
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
        </>
    );
}

export default App;
