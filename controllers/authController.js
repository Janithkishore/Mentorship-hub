/**
 * Authentication Controller
 */

const bcrypt = require('bcryptjs');
const db = require('../database/db');

async function register(req, res) {
    try {
        const { name, email, password, role, department, register_number } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Name, email, password, and role are required.' });
        }

        const validRoles = ['admin', 'student', 'mentor'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role.' });
        }

        if (role === 'student' && !register_number) {
            return res.status(400).json({ error: 'Register number is required for students.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.runAsync(
            'INSERT INTO users (name, email, password, role, department, register_number) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, department || null, register_number || null]
        );

        if (role === 'mentor') {
            await db.runAsync(
                'INSERT INTO mentors (user_id, department, experience_years, specialization) VALUES (?, ?, ?, ?)',
                [result.lastID, department || 'General', 0, null]
            );
        }

        res.status(201).json({
            message: 'Registration successful.',
            user: { id: result.lastID, name, email, role, department, register_number }
        });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email or register number already exists.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Registration failed.' });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await db.getAsync(
            'SELECT user_id, name, email, password, role, department, register_number FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        let mentorId = null;
        if (user.role === 'mentor') {
            const mentor = await db.getAsync('SELECT mentor_id FROM mentors WHERE user_id = ?', [user.user_id]);
            mentorId = mentor ? mentor.mentor_id : null;
        }

        req.session.user = {
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            register_number: user.register_number,
            mentor_id: mentorId
        };

        res.json({
            message: 'Login successful.',
            user: req.session.user
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed.' });
    }
}

function logout(req, res) {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed.' });
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully.' });
    });
}

function me(req, res) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    res.json({ user: req.session.user });
}

module.exports = { register, login, logout, me };
