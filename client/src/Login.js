import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import './AuthForm.css';

function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate(); // Initialize useNavigate

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setMessage("Please provide email and password.");
            return;
        }

        try {
            const response = await fetch('http://localhost:5001/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include', // Include cookies in the request
            });

            console.log("Response:", response); // Log the raw response

            if (!response.ok) {
                const errorText = await response.text(); // Get the error text from the response
                throw new Error(`HTTP error ${response.status}: ${errorText}`); // Throw an error with details
            }

            const data = await response.json();
            console.log("Response Data:", data);

            if (data && data.message === "Login successful.") { // Check for success message from server
                onLoginSuccess(data.user); // Call the onLoginSuccess function to update parent state
                navigate('/dashboard'); // Redirect to dashboard on successful login
            } else if (data && data.message) {
                setMessage(data.message); // Display error message from server
            }
            else {
                setMessage("Login failed. Please check your credentials.");
            }
        } catch (error) {
            console.error("Login error:", error);
            setMessage('Error logging in. Please try again later.');
        }
    };

    return (
        <div className="auth-form">
            <h2>Login</h2>
            {message && <p className={message.includes("Error") ? "error-message" : "success-message"}>{message}</p>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Login</button>
                <p>
                    Don't have an account? <Link to="/signup">Signup</Link>
                </p>
            </form>
        </div>
    );
}

export default Login;