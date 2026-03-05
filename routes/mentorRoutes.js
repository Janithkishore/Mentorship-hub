const express = require('express');
const router = express.Router();
const mentorController = require('../controllers/mentorController');
const { requireRole } = require('../middleware/auth');

router.get('/students', requireRole('mentor'), mentorController.getAssignedStudents);
router.get('/feedback', requireRole('mentor'), mentorController.getMyFeedback);

module.exports = router;
