const mongoose = require("mongoose");
const { INCOME_CATEGORIES, EXPENSE_CATEGORIES } = require("../constants/categories");

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["income", "expense"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [0.01, "Amount must be greater than 0"],
        },
        category: {
            type: String,
            required: true,
            enum: [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES],
        },
        description: {
            type: String,
            trim: true,
            maxlength: 200,
            default: "",
        },
        date: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Fast lookup: one user's transactions, newest first
transactionSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);