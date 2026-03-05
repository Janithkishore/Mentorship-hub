-- ============================================================
-- Mentorship Feedback & Academic Monitoring System
-- Complete SQL Schema
-- ============================================================

PRAGMA foreign_keys = ON;

-- ========== USERS TABLE ==========
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'student', 'mentor')),
    department TEXT,
    register_number TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========== MENTORS TABLE ==========
CREATE TABLE IF NOT EXISTS mentors (
    mentor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    department TEXT NOT NULL,
    experience_years INTEGER CHECK(experience_years >= 0),
    specialization TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ========== ASSIGNMENTS (Mentor-Student mapping) ==========
CREATE TABLE IF NOT EXISTS assignments (
    assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    mentor_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mentor_id, student_id),
    FOREIGN KEY (mentor_id) REFERENCES mentors(mentor_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ========== FEEDBACK QUESTIONS ==========
CREATE TABLE IF NOT EXISTS feedback_questions (
    question_id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK(question_type IN ('rating', 'text', 'yes-no')),
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========== FEEDBACK RESPONSES (references mentor_id) ==========
CREATE TABLE IF NOT EXISTS feedback_responses (
    response_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    mentor_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    response_value TEXT NOT NULL,
    comment TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, mentor_id, question_id),
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES mentors(mentor_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES feedback_questions(question_id) ON DELETE CASCADE
);

-- ========== ATTENDANCE ==========
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_code TEXT NOT NULL,
    total_classes INTEGER NOT NULL CHECK(total_classes >= 0),
    attended_classes INTEGER NOT NULL CHECK(attended_classes >= 0),
    semester TEXT,
    academic_year TEXT,
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(student_id, subject_code, semester, academic_year)
);

-- ========== GRADES / SUBJECT MARKS ==========
CREATE TABLE IF NOT EXISTS grades (
    grade_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject_code TEXT NOT NULL,
    subject_name TEXT,
    marks_obtained REAL NOT NULL CHECK(marks_obtained >= 0 AND marks_obtained <= 100),
    max_marks REAL DEFAULT 100,
    grade TEXT,
    semester TEXT,
    academic_year TEXT,
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ========== PROJECTS ==========
CREATE TABLE IF NOT EXISTS projects (
    project_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    project_title TEXT NOT NULL,
    project_description TEXT,
    marks_obtained REAL,
    max_marks REAL DEFAULT 100,
    semester TEXT,
    status TEXT DEFAULT 'ongoing' CHECK(status IN ('ongoing', 'completed')),
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_feedback_mentor ON feedback_responses(mentor_id);
CREATE INDEX IF NOT EXISTS idx_feedback_student ON feedback_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_mentor ON assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments(student_id);
