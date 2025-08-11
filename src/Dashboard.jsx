// src/Dashboard.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';

const Dashboard = () => {
    const location = useLocation();
    const { name, role } = location.state || {};

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Welcome, {name}!</h1>
            <p>You are logged in as <strong>{role}</strong>.</p>
        </div>
    );
};

export default Dashboard;
