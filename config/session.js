/**
 * Session Configuration
 */

const session = require('express-session');

const sessionConfig = {
    name: 'mentorship.sid',
    secret: process.env.SESSION_SECRET || 'mentorship-feedback-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
};

module.exports = sessionConfig;
