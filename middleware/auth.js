/**
 * Authentication Middleware
 * Role-based access control
 */

const roles = {
    admin: 3,
    mentor: 2,
    student: 1
};

function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Unauthorized. Please login.' });
    }
    next();
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: 'Unauthorized. Please login.' });
        }
        const userRole = req.session.user.role;
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
}

function requireAdmin(req, res, next) {
    return requireRole('admin')(req, res, next);
}

function requireMentor(req, res, next) {
    return requireRole('admin', 'mentor')(req, res, next);
}

function requireStudent(req, res, next) {
    return requireRole('admin', 'student')(req, res, next);
}

module.exports = {
    requireAuth,
    requireRole,
    requireAdmin,
    requireMentor,
    requireStudent,
    roles
};
