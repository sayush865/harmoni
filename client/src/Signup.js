import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AuthForm.css';

function Signup({ onSignupSuccess }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mobile, setMobile] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if validation should be skipped (based on environment variable)
        if (process.env.REACT_APP_SKIP_SIGNUP_VALIDATION !== 'true') {
            // Perform validation ONLY if the env variable is NOT 'true'
            if (!name) {
                setMessage("Please enter your name.");
                return;
            }

            if (!email) {
                setMessage("Please enter your email.");
                return;
            }
            
            if (!password) {
                setMessage("Please enter your password.");
                return;
            }

            if (!mobile) {
                setMessage("Please enter your mobile number.");
                return;
            }

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setMessage("Please enter a valid email address.");
                return;
            }

            if (mobile && !/^\d{10}$/.test(mobile)) {
                setMessage("Please enter a valid 10-digit mobile number.");
                return;
            }
        }

        try {
            const response = await fetch('http://localhost:5001/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password, mobile }),
            });

            const data = await response.json();
            setMessage(data.message);

            if (response.ok) {
                onSignupSuccess();
            } else {
                console.error("Signup failed:", data.message);
                if (data && data.message) {
                    setMessage(data.message);
                } else {
                    setMessage("Signup failed. Please try again later.");
                }
            }
        } catch (error) {
            console.error("Signup error:", error);
            setMessage('Error signing up. Please try again later.');
        }
    };

    return (
        <div className="auth-form">
            <h2>Sign Up</h2>
            {message && <p className={message.includes("Error") ? "error-message" : "success-message"}>{message}</p>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="name">Name:</label>
                    <input type="text" id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <div className="form-group">
                    <label htmlFor="mobile">Mobile:</label>
                    <input type="tel" id="mobile" name="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                </div>
                <button type="submit">Sign Up</button>
                <p>Already have an account? <Link to="/login">Login</Link></p>
            </form>
        </div>
    );
}

export default Signup;