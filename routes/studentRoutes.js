const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { requireRole } = require('../middleware/auth');

router.get('/mentor', requireRole('student'), studentController.getAssignedMentor);

module.exports = router;
