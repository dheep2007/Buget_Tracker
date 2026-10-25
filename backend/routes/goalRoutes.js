const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  addProgress,
  deleteGoal,
} = require('../controllers/goalController');

const router = express.Router();

// All routes protected
router.use(protect);

router.post('/', createGoal);
router.get('/', getGoals);
router.get('/:id', getGoalById);
router.put('/:id', updateGoal);
router.patch('/:id/progress', addProgress);
router.delete('/:id', deleteGoal);

module.exports = router;
