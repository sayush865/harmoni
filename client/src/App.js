import React, { useState, useEffect } from 'react';
import Signup from './Signup';
import Login from './Login';
import Dashboard from './Dashboard';
import Profile from './Profile';
import './App.css';
import { Routes, Route, useNavigate, Link, Outlet, Navigate } from 'react-router-dom';
import logo from './harmoni-logo.png';
import TestRetell from './TestRetell'; 
import MinimalRetellTest from './MinimalRetellTest';

const Layout = ({ isAuthenticated, handleLogout }) => {
    return (
        <div className="app-container">
            <nav className="navbar">
                <Link to="/" className="nav-brand">
                    <span className="brand-container">
                        <img src={logo} alt="Harmoni Logo" className="logo" />
                        <span>Harmoni</span>
                    </span>
                </Link>
                <div className="nav-links">
                    {!isAuthenticated && (
                        <>
                            <Link to="/login">Login</Link>
                            <Link to="/signup">Signup</Link>
                        </>
                    )}
                    {isAuthenticated && (
                        <button onClick={handleLogout}>Logout</button>
                    )}
                </div>
            </nav>
            <Outlet />
        </div>
    );
};

const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/check-auth', { credentials: 'include' }); // Relative URL
                if (!response.ok) {
                    if (response.status === 401) {
                        setIsAuthenticated(false);
                        setUser(null);
                    } else {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                } else {
                    const data = await response.json();
                    setIsAuthenticated(data.isAuthenticated);
                    setUser(data.user);
                }
            } catch (error) {
                console.error("Authentication check error:", error);
                setAuthError("Failed to check authentication. Please try again later.");
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    return { isAuthenticated, user, loading, authError };
};

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading, authError } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (authError) {
        return <div className="error-message">{authError}</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return children;
};

function App() {
    const navigate = useNavigate();
    const { isAuthenticated, loading, authError, user } = useAuth();

    const handleLoginSuccess = (user) => {
        navigate("/dashboard");
    };

    const handleSignupSuccess = () => {
        navigate('/login');
    };

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/logout', { credentials: 'include' }); // Relative URL
            if (!response.ok) {
                console.error("Logout failed");
                return;
            }
            navigate('/login');
        } catch (error) {
            console.error("Error during logout:", error);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (authError) {
        return <div className="error-message">{authError}</div>;
    }

    return (
        <Routes>
            <Route path="/" element={<Layout isAuthenticated={isAuthenticated} handleLogout={handleLogout} />}>
                <Route path="signup" element={<Signup onSignupSuccess={handleSignupSuccess} />} />
                <Route path="login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard handleLogout={handleLogout} user={user} /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile user={user} /></ProtectedRoute>} />
                <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
                <Route path="/test-retell" element={<TestRetell />} /> 
                <Route path="/retell" element={<MinimalRetellTest />} />
            </Route>
        </Routes>
    );
}

export default App;

