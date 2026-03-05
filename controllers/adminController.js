/**
 * Admin Controller
 * Student & Mentor performance monitoring, analytics, reports
 */

const db = require('../database/db');

// ========== DASHBOARD STATS ==========
async function getDashboardStats(req, res) {
    try {
        const [totalStudents] = await db.allAsync('SELECT COUNT(*) as cnt FROM users WHERE role = "student"');
        const [totalMentors] = await db.allAsync('SELECT COUNT(*) as cnt FROM mentors');
        const avgPerf = await db.getAsync(`
            SELECT AVG(avg_marks) as avg_performance FROM (
                SELECT student_id, AVG(marks_obtained * 100.0 / NULLIF(max_marks, 0)) as avg_marks
                FROM grades GROUP BY student_id
            )
        `);
        const avgRating = await db.getAsync(`
            SELECT AVG(CAST(response_value AS REAL)) as avg_rating
            FROM feedback_responses fr
            JOIN feedback_questions fq ON fr.question_id = fq.question_id
            WHERE fq.question_type = 'rating' AND CAST(fr.response_value AS REAL) BETWEEN 1 AND 5
        `);
        const lowAttendance = await db.allAsync(`
            SELECT u.user_id, u.name, u.register_number, a.subject_code,
                   ROUND(100.0 * a.attended_classes / NULLIF(a.total_classes, 0), 1) as pct
            FROM attendance a
            JOIN users u ON a.student_id = u.user_id
            WHERE 100.0 * a.attended_classes / NULLIF(a.total_classes, 0) < 75
        `);
        const topMentors = await db.allAsync(`
            SELECT m.mentor_id, u.name, m.department,
                   ROUND(AVG(CAST(fr.response_value AS REAL)), 2) as avg_rating,
                   COUNT(*) as feedback_count
            FROM mentors m
            JOIN users u ON m.user_id = u.user_id
            LEFT JOIN feedback_responses fr ON m.mentor_id = fr.mentor_id
            LEFT JOIN feedback_questions fq ON fr.question_id = fq.question_id AND fq.question_type = 'rating'
            WHERE CAST(fr.response_value AS REAL) BETWEEN 1 AND 5
            GROUP BY m.mentor_id
            ORDER BY avg_rating DESC
            LIMIT 5
        `);

        res.json({
            total_students: totalStudents?.cnt || 0,
            total_mentors: totalMentors?.cnt || 0,
            avg_student_performance: avgPerf?.avg_performance ? Math.round(avgPerf.avg_performance) : 0,
            avg_mentor_rating: avgRating?.avg_rating ? Math.round(avgRating.avg_rating * 10) / 10 : 0,
            low_attendance_students: lowAttendance,
            top_mentors: topMentors
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load dashboard.' });
    }
}

// ========== USERS MANAGEMENT ==========
async function getUsers(req, res) {
    try {
        const users = await db.allAsync(
            'SELECT user_id, name, email, role, department, register_number FROM users'
        );
        res.json({ users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load users.' });
    }
}

// ========== MENTORS ==========
async function getMentors(req, res) {
    try {
        const mentors = await db.allAsync(`
            SELECT m.mentor_id, m.user_id, u.name, u.email, m.department, m.experience_years, m.specialization
            FROM mentors m
            JOIN users u ON m.user_id = u.user_id
        `);
        res.json({ mentors });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load mentors.' });
    }
}

// ========== ASSIGNMENTS ==========
async function assignMentor(req, res) {
    try {
        const { mentor_id, student_id } = req.body;
        if (!mentor_id || !student_id) {
            return res.status(400).json({ error: 'Mentor ID and student ID required.' });
        }
        await db.runAsync('INSERT OR REPLACE INTO assignments (mentor_id, student_id) VALUES (?, ?)', [mentor_id, student_id]);
        res.status(201).json({ message: 'Mentor assigned successfully.' });
    } catch (err) {
        if (err.message && err.message.includes('FOREIGN KEY')) {
            return res.status(400).json({ error: 'Invalid mentor or student.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Assignment failed.' });
    }
}

// ========== QUESTIONS ==========
async function getQuestions(req, res) {
    try {
        const questions = await db.allAsync('SELECT * FROM feedback_questions');
        res.json({ questions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load questions.' });
    }
}

async function createQuestion(req, res) {
    try {
        const { question_text, question_type } = req.body;
        if (!question_text || !question_type) {
            return res.status(400).json({ error: 'Question text and type required.' });
        }
        const r = await db.runAsync(
            'INSERT INTO feedback_questions (question_text, question_type) VALUES (?, ?)',
            [question_text, question_type]
        );
        res.status(201).json({ message: 'Question created.', id: r.lastID });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create question.' });
    }
}

// ========== STUDENT PERFORMANCE ==========
async function searchStudents(req, res) {
    try {
        const { q } = req.query;
        let sql = 'SELECT user_id, name, email, register_number, department FROM users WHERE role = "student"';
        const params = [];
        if (q) {
            sql += ' AND (name LIKE ? OR register_number LIKE ? OR email LIKE ?)';
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        const students = await db.allAsync(sql, params);
        res.json({ students });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Search failed.' });
    }
}

async function getStudentProfile(req, res) {
    try {
        const { id } = req.params;
        const student = await db.getAsync(
            'SELECT user_id, name, email, register_number, department FROM users WHERE user_id = ? AND role = "student"',
            [id]
        );
        if (!student) return res.status(404).json({ error: 'Student not found.' });

        const attendance = await db.allAsync(
            'SELECT subject_code, total_classes, attended_classes, ROUND(100.0*attended_classes/NULLIF(total_classes,0),1) as pct FROM attendance WHERE student_id = ?',
            [id]
        );
        const grades = await db.allAsync(
            'SELECT subject_code, subject_name, marks_obtained, max_marks, grade, semester FROM grades WHERE student_id = ?',
            [id]
        );
        const projects = await db.allAsync(
            'SELECT project_title, project_description, marks_obtained, max_marks, status, semester FROM projects WHERE student_id = ?',
            [id]
        );

        let overallAvg = 0;
        let cgpa = 0;
        if (grades.length) {
            const validGrades = grades.filter(g => g.max_marks > 0);
            overallAvg = validGrades.length
                ? validGrades.reduce((s, g) => s + (g.marks_obtained / g.max_marks) * 100, 0) / validGrades.length
                : 0;
            cgpa = overallAvg / 10; // simplified CGPA
        }

        const avgAttendance = attendance.length
            ? attendance.reduce((s, a) => s + (a.pct || 0), 0) / attendance.length
            : null;

        const attendanceAlert = avgAttendance !== null && avgAttendance < 75;

        res.json({
            student,
            attendance,
            grades,
            projects,
            overall_performance: Math.round(overallAvg * 10) / 10,
            cgpa: Math.round(cgpa * 100) / 100,
            avg_attendance: avgAttendance ? Math.round(avgAttendance * 10) / 10 : null,
            attendance_alert: attendanceAlert
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load profile.' });
    }
}

// ========== MENTOR PERFORMANCE ==========
async function getMentorProfile(req, res) {
    try {
        const { id } = req.params;
        const mentor = await db.getAsync(`
            SELECT m.mentor_id, m.user_id, u.name, u.email, m.department, m.experience_years, m.specialization
            FROM mentors m JOIN users u ON m.user_id = u.user_id WHERE m.mentor_id = ?
        `, [id]);
        if (!mentor) return res.status(404).json({ error: 'Mentor not found.' });

        const [studentCount] = await db.allAsync(
            'SELECT COUNT(*) as cnt FROM assignments WHERE mentor_id = ?',
            [id]
        );
        const avgRating = await db.getAsync(`
            SELECT ROUND(AVG(CAST(fr.response_value AS REAL)), 2) as avg_rating
            FROM feedback_responses fr
            JOIN feedback_questions fq ON fr.question_id = fq.question_id
            WHERE fr.mentor_id = ? AND fq.question_type = 'rating' AND CAST(fr.response_value AS REAL) BETWEEN 1 AND 5
        `, [id]);
        const trends = await db.allAsync(`
            SELECT DATE(submitted_at) as date, ROUND(AVG(CAST(response_value AS REAL)), 2) as avg_rating
            FROM feedback_responses fr
            JOIN feedback_questions fq ON fr.question_id = fq.question_id
            WHERE fr.mentor_id = ? AND fq.question_type = 'rating'
            GROUP BY DATE(submitted_at)
            ORDER BY date
        `, [id]);
        const deptPerformance = await db.allAsync(`
            SELECT m.department, ROUND(AVG(CAST(fr.response_value AS REAL)), 2) as avg_rating
            FROM feedback_responses fr
            JOIN mentors m ON fr.mentor_id = m.mentor_id
            JOIN feedback_questions fq ON fr.question_id = fq.question_id
            WHERE fq.question_type = 'rating'
            GROUP BY m.department
        `);

        res.json({
            mentor,
            total_students_assigned: studentCount?.cnt || 0,
            average_rating: avgRating?.avg_rating || null,
            feedback_trends: trends,
            department_performance: deptPerformance
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load mentor profile.' });
    }
}

async function getMentorComparison(req, res) {
    try {
        const rows = await db.allAsync(`
            SELECT m.mentor_id, u.name, m.department,
                   ROUND(AVG(CAST(fr.response_value AS REAL)), 2) as avg_rating,
                   COUNT(*) as response_count
            FROM mentors m
            JOIN users u ON m.user_id = u.user_id
            LEFT JOIN feedback_responses fr ON m.mentor_id = fr.mentor_id
            LEFT JOIN feedback_questions fq ON fr.question_id = fq.question_id AND fq.question_type = 'rating'
            WHERE CAST(fr.response_value AS REAL) BETWEEN 1 AND 5 OR fr.response_id IS NULL
            GROUP BY m.mentor_id
        `);
        res.json({ mentors: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load comparison.' });
    }
}

// ========== ATTENDANCE, GRADES, PROJECTS (Admin CRUD) ==========
async function addAttendance(req, res) {
    try {
        const { student_id, subject_code, total_classes, attended_classes, semester, academic_year } = req.body;
        if (!student_id || !subject_code || total_classes == null || attended_classes == null) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }
        await db.runAsync(`
            INSERT OR REPLACE INTO attendance (student_id, subject_code, total_classes, attended_classes, semester, academic_year)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [student_id, subject_code, total_classes, attended_classes, semester || null, academic_year || null]);
        res.status(201).json({ message: 'Attendance recorded.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add attendance.' });
    }
}

async function addGrade(req, res) {
    try {
        const { student_id, subject_code, subject_name, marks_obtained, max_marks, grade, semester, academic_year } = req.body;
        if (!student_id || !subject_code || marks_obtained == null) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }
        await db.runAsync(`
            INSERT INTO grades (student_id, subject_code, subject_name, marks_obtained, max_marks, grade, semester, academic_year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [student_id, subject_code, subject_name || null, marks_obtained, max_marks || 100, grade || null, semester || null, academic_year || null]);
        res.status(201).json({ message: 'Grade added.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add grade.' });
    }
}

async function addProject(req, res) {
    try {
        const { student_id, project_title, project_description, marks_obtained, max_marks, semester, status } = req.body;
        if (!student_id || !project_title) {
            return res.status(400).json({ error: 'Student ID and project title required.' });
        }
        await db.runAsync(`
            INSERT INTO projects (student_id, project_title, project_description, marks_obtained, max_marks, semester, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [student_id, project_title, project_description || null, marks_obtained || null, max_marks || 100, semester || null, status || 'ongoing']);
        res.status(201).json({ message: 'Project added.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add project.' });
    }
}

// ========== REPORTS ==========
async function getReports(req, res) {
    try {
        const reports = await db.allAsync(`
            SELECT fr.response_id, fr.submitted_at, u_s.name as student_name, u_m.name as mentor_name,
                   fq.question_text, fr.response_value, fr.comment
            FROM feedback_responses fr
            JOIN users u_s ON fr.student_id = u_s.user_id
            JOIN mentors m ON fr.mentor_id = m.mentor_id
            JOIN users u_m ON m.user_id = u_m.user_id
            JOIN feedback_questions fq ON fr.question_id = fq.question_id
            ORDER BY fr.submitted_at DESC
        `);
        res.json({ reports });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load reports.' });
    }
}

module.exports = {
    getDashboardStats,
    getUsers,
    getMentors,
    assignMentor,
    getQuestions,
    createQuestion,
    searchStudents,
    getStudentProfile,
    getMentorProfile,
    getMentorComparison,
    addAttendance,
    addGrade,
    addProject,
    getReports
};
