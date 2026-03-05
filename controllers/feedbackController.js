/**
 * Feedback Controller
 * Submit, view, filter, delete feedback
 */

const db = require('../database/db');

// Get active feedback questions
async function getQuestions(req, res) {
    try {
        const questions = await db.allAsync(
            'SELECT question_id, question_text, question_type FROM feedback_questions WHERE is_active = 1'
        );
        res.json({ questions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load questions.' });
    }
}

// Submit feedback (student)
async function submitFeedback(req, res) {
    try {
        const studentId = req.session.user.id;
        const { mentor_id, answers, comment } = req.body;

        if (!mentor_id || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Mentor ID and answers array are required.' });
        }

        // Verify student is assigned to this mentor
        const assignment = await db.getAsync(
            'SELECT assignment_id FROM assignments WHERE mentor_id = ? AND student_id = ?',
            [mentor_id, studentId]
        );

        if (!assignment) {
            return res.status(403).json({ error: 'You are not assigned to this mentor.' });
        }

        // Prevent duplicate submissions (same student, same mentor, same question)
        for (const a of answers) {
            const existing = await db.getAsync(
                'SELECT response_id FROM feedback_responses WHERE student_id = ? AND mentor_id = ? AND question_id = ?',
                [studentId, mentor_id, a.question_id]
            );
            if (existing) {
                return res.status(400).json({ error: 'Duplicate feedback. You have already submitted feedback for this mentor.' });
            }
        }

        for (const a of answers) {
            await db.runAsync(
                'INSERT INTO feedback_responses (student_id, mentor_id, question_id, response_value, comment) VALUES (?, ?, ?, ?, ?)',
                [studentId, mentor_id, a.question_id, String(a.response_value), comment || null]
            );
        }

        res.status(201).json({ message: 'Feedback submitted successfully.' });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Duplicate feedback. You have already submitted feedback for this mentor.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Failed to submit feedback.' });
    }
}

// View feedback (mentor/admin) - filter by mentor, department
async function getFeedback(req, res) {
    try {
        const { mentor_id, department } = req.query;

        let sql = `
            SELECT fr.response_id, fr.student_id, u.name as student_name, fr.mentor_id,
                   um.name as mentor_name, m.department as mentor_dept,
                   fq.question_text, fq.question_type, fr.response_value, fr.comment, fr.submitted_at
            FROM feedback_responses fr
            JOIN users u ON fr.student_id = u.user_id
            JOIN mentors m ON fr.mentor_id = m.mentor_id
            JOIN users um ON m.user_id = um.user_id
            JOIN feedback_questions fq ON fr.question_id = fq.question_id
            WHERE 1=1
        `;
        const params = [];

        if (mentor_id) {
            sql += ' AND fr.mentor_id = ?';
            params.push(mentor_id);
        }
        if (department) {
            sql += ' AND m.department = ?';
            params.push(department);
        }

        sql += ' ORDER BY fr.submitted_at DESC';

        const feedback = await db.allAsync(sql, params);
        res.json({ feedback });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load feedback.' });
    }
}

// Delete feedback (mentor/admin)
async function deleteFeedback(req, res) {
    try {
        const { response_id } = req.params;
        const user = req.session.user;

        const row = await db.getAsync('SELECT * FROM feedback_responses WHERE response_id = ?', [response_id]);
        if (!row) return res.status(404).json({ error: 'Feedback not found.' });

        if (user.role === 'mentor' && row.mentor_id !== user.mentor_id) {
            return res.status(403).json({ error: 'You can only delete your own feedback.' });
        }

        await db.runAsync('DELETE FROM feedback_responses WHERE response_id = ?', [response_id]);
        res.json({ message: 'Feedback deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete feedback.' });
    }
}

// Get feedback history for student
async function getMyFeedbackHistory(req, res) {
    try {
        const studentId = req.session.user.id;
        const rows = await db.allAsync(`
            SELECT fr.response_id, m.mentor_id, u.name as mentor_name, fq.question_text, fr.response_value, fr.submitted_at
            FROM feedback_responses fr
            JOIN mentors m ON fr.mentor_id = m.mentor_id
            JOIN users u ON m.user_id = u.user_id
            JOIN feedback_questions fq ON fr.question_id = fq.question_id
            WHERE fr.student_id = ?
            ORDER BY fr.submitted_at DESC
        `, [studentId]);
        res.json({ history: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load history.' });
    }
}

// Mentor analytics: average rating, feedback count
async function getMentorAnalytics(req, res) {
    try {
        const { mentor_id } = req.query;
        const mentorId = mentor_id || req.session.user?.mentor_id;

        if (!mentorId) return res.status(400).json({ error: 'Mentor ID required.' });

        const ratings = await db.allAsync(`
            SELECT fr.response_value
            FROM feedback_responses fr
            JOIN feedback_questions fq ON fr.question_id = fq.question_id
            WHERE fr.mentor_id = ? AND fq.question_type = 'rating'
        `, [mentorId]);

        const numericRatings = ratings
            .map(r => parseInt(r.response_value, 10))
            .filter(n => !isNaN(n) && n >= 1 && n <= 5);

        const avgRating = numericRatings.length
            ? (numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length).toFixed(2)
            : null;

        const totalFeedback = await db.getAsync(
            'SELECT COUNT(DISTINCT student_id || "-" || submitted_at) as cnt FROM feedback_responses WHERE mentor_id = ?',
            [mentorId]
        );

        res.json({
            average_rating: avgRating,
            total_responses: ratings.length,
            submission_count: totalFeedback?.cnt || 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load analytics.' });
    }
}

module.exports = {
    getQuestions,
    submitFeedback,
    getFeedback,
    deleteFeedback,
    getMyFeedbackHistory,
    getMentorAnalytics
};
