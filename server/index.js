const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

// Optional WebSocket setup (if needed)
const ws = require('ws');
const wss = new ws.Server({ port: 8080 });
wss.on('connection', socket => {
    console.log("Client connected to websocket");
    socket.on('message', message => {
        wss.clients.forEach(client => {
            if (client !== socket && client.readyState === ws.OPEN) {
                client.send(message);
            }
        });
    });
    socket.on('close', () => console.log("Client disconnected"));
});

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));

app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Use a strong, randomly generated secret in production
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({ db: 'sessions.db' }),
    cookie: {
        secure: false, // Set to true in production (HTTPS)
        httpOnly: true,
        maxAge: 3600000, // 1 hour in milliseconds
        sameSite: 'lax', // Use 'strict' in production
        path: '/'
    }
}));

const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error("Database opening error " + err);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                mobile TEXT
            )
        `);
    }
});

app.post('/api/signup', async (req, res) => {
    const { name, email, password, mobile } = req.body;

    if (!name || !email || !password || !mobile) {
        return res.status(400).json({ message: "Please fill in all fields." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (name, email, password, mobile) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, mobile], function (err) {
            if (err) {
                if (err.errno === 19) { // SQLITE_CONSTRAINT: Email already exists
                    return res.status(400).json({ message: "Email already exists." });
                }
                console.error("Signup database error:", err);
                return res.status(500).json({ message: "An error occurred during signup." });
            }
            res.status(201).json({ message: "User registered successfully." });
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "An error occurred during signup." });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password." });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error("Login database error:", err);
            return res.status(500).json({ message: "An error occurred during login." });
        }

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        try {
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                req.session.user = { id: user.id, name: user.name, email: user.email };
                return res.status(200).json({ message: "Login successful.", user: { id: user.id, name: user.name, email: user.email } });
            } else {
                return res.status(401).json({ message: "Invalid credentials." });
            }
        } catch (bcryptError) {
            console.error("Bcrypt compare error:", bcryptError);
            return res.status(500).json({ message: "An error occurred during login." });
        }
    });
});

app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ isAuthenticated: true, user: req.session.user });
    } else {
        res.json({ isAuthenticated: false });
    }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ message: "Logout failed." });
        }
        res.clearCookie('connect.sid'); // Important: Clear the cookie
        res.json({ message: "Logout successful." });
    });
});

app.post('/api/create-call', async (req, res) => {
    const { agentId } = req.body;

    if (!agentId) {
        return res.status(400).json({ error: "Agent ID is required." });
    }

    try {
        console.log("API Key from .env:", process.env.RETELL_API_KEY);
        const response = await fetch('https://api.retellai.com/v2/create-web-call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RETELL_API_KEY}`
            },
            body: JSON.stringify({ agent_id: agentId }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Retell API Error:", response.status, errorText);
            return res.status(response.status).json({ error: `Retell API Error: ${errorText}` });
        }

        const data = await response.json();
        if (!data.access_token) {
            console.error("Retell API Error: Access token not received");
            return res.status(500).json({ error: "Retell API Error: Access token not received" });
        }
        res.json({ accessToken: data.access_token });
    } catch (error) {
        console.error("Server error in /api/create-call:", error);
        res.status(500).json({ error: "Server error creating call." });
    }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));