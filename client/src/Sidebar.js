import React from 'react';
import { Link } from 'react-router-dom';

function Sidebar({ handleLogout }) {
    return (
        <div className="sidebar">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/profile">Profile</Link>
            <button onClick={handleLogout}>Logout</button>
        </div>
    );
}

export default Sidebar;