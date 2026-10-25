const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const { INCOME_CATEGORIES, EXPENSE_CATEGORIES } = require("../constants/categories");

// @route   GET /api/transactions/categories
// @access  Private
// Returns both category lists so the frontend can build dropdowns
const getCategories = async (req, res) => {
    try {
        res.json({ income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// @route   GET /api/transactions
// @access  Private
// Returns the logged-in user's transactions, newest first.
// Optional filters: ?type=income|expense and ?category=Food
const getTransactions = async (req, res) => {
    try {
        // Start with only this user's transactions
        const filter = { user: req.user._id };

        // Add optional query filters if provided
        if (req.query.type) {
            filter.type = req.query.type;
        }
        if (req.query.category) {
            filter.category = req.query.category;
        }

        // Sort by date descending (newest first)
        const transactions = await Transaction.find(filter).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Helper: validate transaction fields before create or update
// Returns an error message string, or null if everything is valid
const validateFields = (body, isUpdate) => {
    const { type, amount, category, description, date } = body;

    // For create: type, amount, and category are required
    // For update: only validate fields that are present
    if (!isUpdate) {
        if (!type) return "Type is required";
        if (amount === undefined || amount === null || amount === "") return "Amount is required";
        if (!category) return "Category is required";
    }

    // Validate type if provided
    if (type !== undefined && type !== "income" && type !== "expense") {
        return "Type must be 'income' or 'expense'";
    }

    // Validate amount if provided
    if (amount !== undefined && amount !== null && amount !== "") {
        if (typeof amount !== "number" || isNaN(amount)) {
            return "Amount must be a number";
        }
        if (amount <= 0) {
            return "Amount must be greater than 0";
        }
    }

    // Validate category matches the type
    if (category !== undefined) {
        // Figure out which type to check against
        const effectiveType = type || body._existingType;

        if (effectiveType === "income" && !INCOME_CATEGORIES.includes(category)) {
            return `Invalid category for income. Choose from: ${INCOME_CATEGORIES.join(", ")}`;
        }
        if (effectiveType === "expense" && !EXPENSE_CATEGORIES.includes(category)) {
            return `Invalid category for expense. Choose from: ${EXPENSE_CATEGORIES.join(", ")}`;
        }
    }

    // Validate description length if provided
    if (description !== undefined && description.length > 200) {
        return "Description must be 200 characters or less";
    }

    // Validate date if provided
    if (date !== undefined && date !== null && date !== "") {
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) {
            return "Invalid date";
        }
    }

    return null; // no errors
};

// @route   POST /api/transactions
// @access  Private
// Creates a new transaction for the logged-in user
const createTransaction = async (req, res) => {
    try {
        const { type, amount, category, description, date } = req.body;

        // Run our validation
        const error = validateFields(req.body, false);
        if (error) {
            return res.status(400).json({ message: error });
        }

        // Build the transaction object
        const transactionData = {
            user: req.user._id,
            type,
            amount,
            category,
        };

        // Only add optional fields if provided
        if (description !== undefined) transactionData.description = description;
        if (date) transactionData.date = date;

        const transaction = await Transaction.create(transactionData);
        res.status(201).json(transaction);
    } catch (error) {
        // Catch any Mongoose validation errors we missed
        if (error.name === "ValidationError") {
            const message = Object.values(error.errors)[0].message;
            return res.status(400).json({ message });
        }
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// @route   PUT /api/transactions/:id
// @access  Private
// Updates a transaction that belongs to the logged-in user
const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if id is a valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid transaction id" });
        }

        // Find the transaction AND make sure it belongs to this user
        const transaction = await Transaction.findOne({ _id: id, user: req.user._id });
        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        // For validation: if type isn't being changed, use the existing type
        // so we can check if category is valid for that type
        const bodyWithType = { ...req.body, _existingType: transaction.type };
        const error = validateFields(bodyWithType, true);
        if (error) {
            return res.status(400).json({ message: error });
        }

        // Apply the updates
        const { type, amount, category, description, date } = req.body;
        if (type !== undefined) transaction.type = type;
        if (amount !== undefined) transaction.amount = amount;
        if (category !== undefined) transaction.category = category;
        if (description !== undefined) transaction.description = description;
        if (date !== undefined) transaction.date = date;

        const updated = await transaction.save();
        res.json(updated);
    } catch (error) {
        if (error.name === "ValidationError") {
            const message = Object.values(error.errors)[0].message;
            return res.status(400).json({ message });
        }
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// @route   DELETE /api/transactions/:id
// @access  Private
// Deletes a transaction that belongs to the logged-in user
const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if id is a valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid transaction id" });
        }

        // Find and delete in one step, only if it belongs to this user
        const transaction = await Transaction.findOneAndDelete({ _id: id, user: req.user._id });
        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json({ message: "Transaction deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getCategories,
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
};
