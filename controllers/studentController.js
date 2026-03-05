/**
 * Student Controller
 */

const db = require('../database/db');

async function getAssignedMentor(req, res) {
    try {
        const studentId = req.session.user.id;
        const mentor = await db.getAsync(`
            SELECT m.mentor_id, u.name, u.email, m.department, m.experience_years, m.specialization
            FROM assignments a
            JOIN mentors m ON a.mentor_id = m.mentor_id
            JOIN users u ON m.user_id = u.user_id
            WHERE a.student_id = ?
        `, [studentId]);
        res.json({ mentor });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load mentor.' });
    }
}

module.exports = { getAssignedMentor };
