const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/questions', feedbackController.getQuestions);

router.post('/submit', requireAuth, requireRole('student'), feedbackController.submitFeedback);
router.get('/history', requireAuth, requireRole('student'), feedbackController.getMyFeedbackHistory);

router.get('/', requireAuth, requireRole('admin', 'mentor'), feedbackController.getFeedback);
router.delete('/:response_id', requireAuth, requireRole('admin', 'mentor'), feedbackController.deleteFeedback);

router.get('/analytics', requireAuth, requireRole('admin', 'mentor'), feedbackController.getMentorAnalytics);

module.exports = router;
