const express = require("express");
const {
    getCategories,
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
} = require("../controllers/transactionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes below require a valid token
router.use(protect);

// GET /api/transactions/categories — must come BEFORE /:id routes
router.get("/categories", getCategories);

// GET /api/transactions       — list user's transactions
// POST /api/transactions      — create a new transaction
router.get("/", getTransactions);
router.post("/", createTransaction);

// PUT /api/transactions/:id   — update a transaction
// DELETE /api/transactions/:id — delete a transaction
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
