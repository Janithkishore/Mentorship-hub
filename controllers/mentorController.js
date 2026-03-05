/**
 * Mentor Controller
 */

const db = require('../database/db');

async function getAssignedStudents(req, res) {
    try {
        const mentorId = req.session.user.mentor_id;
        if (!mentorId) return res.json({ students: [] });

        const students = await db.allAsync(`
            SELECT u.user_id, u.name, u.email, u.register_number, u.department
            FROM assignments a
            JOIN users u ON a.student_id = u.user_id
            WHERE a.mentor_id = ?
        `, [mentorId]);
        res.json({ students });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load students.' });
    }
}

async function getMyFeedback(req, res) {
    try {
        const mentorId = req.session.user.mentor_id;
        if (!mentorId) return res.json({ feedback: [] });

        const feedback = await db.allAsync(`
            SELECT fr.response_id, fr.student_id, u.name as student_name, fq.question_text, fr.response_value, fr.comment, fr.submitted_at
            FROM feedback_responses fr
            JOIN users u ON fr.student_id = u.user_id
            JOIN feedback_questions fq ON fr.question_id = fq.question_id
            WHERE fr.mentor_id = ?
            ORDER BY fr.submitted_at DESC
        `, [mentorId]);
        res.json({ feedback });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load feedback.' });
    }
}

module.exports = { getAssignedStudents, getMyFeedback };
