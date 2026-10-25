const mongoose = require('mongoose');
const Goal = require('../models/Goal');

// Helper to format goal with calculated fields
const formatGoal = (goal) => {
  const progressPercent = goal.targetAmount
    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
    : 0;
  return {
    _id: goal._id,
    user: goal.user,
    title: goal.title,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    deadline: goal.deadline,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    progressPercent,
    remainingAmount: Math.max(0, goal.targetAmount - goal.currentAmount),
    isCompleted: goal.currentAmount >= goal.targetAmount,
  };
};

// @route   POST /api/goals
// @access  Private
const createGoal = async (req, res) => {
  try {
    const { title, targetAmount, currentAmount = 0, deadline } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (title.length > 100) {
      return res.status(400).json({ message: 'Title must be at most 100 characters' });
    }
    if (typeof targetAmount !== 'number' || isNaN(targetAmount) || targetAmount <= 0) {
      return res.status(400).json({ message: 'targetAmount must be a number greater than 0' });
    }
    if (typeof currentAmount !== 'number' || isNaN(currentAmount) || currentAmount < 0) {
      return res.status(400).json({ message: 'currentAmount cannot be negative' });
    }
    if (deadline && isNaN(new Date(deadline).getTime())) {
      return res.status(400).json({ message: 'Invalid deadline date' });
    }
    const goal = await Goal.create({
      user: req.user._id,
      title: title.trim(),
      targetAmount,
      currentAmount,
      deadline: deadline ? new Date(deadline) : undefined,
    });
    res.status(201).json(formatGoal(goal));
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      return res.status(400).json({ message });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/goals
// @access  Private
const getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(goals.map(formatGoal));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/goals/:id
// @access  Private
const getGoalById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid goal id' });
    }
    const goal = await Goal.findOne({ _id: id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json(formatGoal(goal));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   PUT /api/goals/:id
// @access  Private
const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid goal id' });
    }
    const goal = await Goal.findOne({ _id: id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    const { title, targetAmount, currentAmount, deadline } = req.body;
    if (title !== undefined) {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ message: 'Title is required' });
      }
      if (title.length > 100) {
        return res.status(400).json({ message: 'Title must be at most 100 characters' });
      }
      goal.title = title.trim();
    }
    if (targetAmount !== undefined) {
      if (typeof targetAmount !== 'number' || isNaN(targetAmount) || targetAmount <= 0) {
        return res.status(400).json({ message: 'targetAmount must be a number greater than 0' });
      }
      goal.targetAmount = targetAmount;
    }
    if (currentAmount !== undefined) {
      if (typeof currentAmount !== 'number' || isNaN(currentAmount) || currentAmount < 0) {
        return res.status(400).json({ message: 'currentAmount cannot be negative' });
      }
      goal.currentAmount = currentAmount;
    }
    if (deadline !== undefined) {
      if (deadline && isNaN(new Date(deadline).getTime())) {
        return res.status(400).json({ message: 'Invalid deadline date' });
      }
      goal.deadline = deadline ? new Date(deadline) : undefined;
    }
    await goal.save();
    res.json(formatGoal(goal));
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      return res.status(400).json({ message });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   PATCH /api/goals/:id/progress
// @access  Private
// Body may contain { amount } to add or { currentAmount } to set directly
const addProgress = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid goal id' });
    }
    const goal = await Goal.findOne({ _id: id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    const { amount, currentAmount } = req.body;
    if (amount !== undefined) {
      if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'amount must be a positive number' });
      }
      goal.currentAmount += amount;
    } else if (currentAmount !== undefined) {
      if (typeof currentAmount !== 'number' || isNaN(currentAmount) || currentAmount < 0) {
        return res.status(400).json({ message: 'currentAmount must be a non‑negative number' });
      }
      goal.currentAmount = currentAmount;
    } else {
      return res.status(400).json({ message: 'Either amount or currentAmount must be provided' });
    }
    await goal.save();
    res.json(formatGoal(goal));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid goal id' });
    }
    const goal = await Goal.findOneAndDelete({ _id: id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  addProgress,
  deleteGoal,
};
