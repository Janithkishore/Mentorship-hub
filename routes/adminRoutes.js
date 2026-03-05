const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

// Dashboard
router.get('/dashboard', requireAdmin, adminController.getDashboardStats);

// Users & Mentors
router.get('/users', requireAdmin, adminController.getUsers);
router.get('/mentors', requireAdmin, adminController.getMentors);

// Assignments
router.post('/assignments', requireAdmin, adminController.assignMentor);

// Questions
router.get('/questions', requireAdmin, adminController.getQuestions);
router.post('/questions', requireAdmin, adminController.createQuestion);

// Student performance
router.get('/students/search', requireAdmin, adminController.searchStudents);
router.get('/students/:id', requireAdmin, adminController.getStudentProfile);

// Mentor performance
router.get('/mentors/:id/profile', requireAdmin, adminController.getMentorProfile);
router.get('/mentors/comparison', requireAdmin, adminController.getMentorComparison);

// Attendance, Grades, Projects
router.post('/attendance', requireAdmin, adminController.addAttendance);
router.post('/grades', requireAdmin, adminController.addGrade);
router.post('/projects', requireAdmin, adminController.addProject);

// Reports
router.get('/reports', requireAdmin, adminController.getReports);

module.exports = router;
