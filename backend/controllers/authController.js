const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper: create a token that contains the user's id
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
};

// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Please fill in all fields" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email is already registered" });
        }

        const user = await User.create({ name, email, password });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const message = Object.values(error.errors)[0].message;
            return res.status(400).json({ message });
        }
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check for empty fields
        if (!email || !password) {
            return res.status(400).json({ message: "Please enter email and password" });
        }

        // 2. Find the user. +password brings back the hash we hid with select:false
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

        // 3. Same message for "no such user" and "wrong password"
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // 4. Success: send token and basic info
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
// @route   GET /api/auth/me
// @access  Private (needs a valid token)
const getMe = async (req, res) => {
    res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
    });
};

module.exports = { registerUser, loginUser, getMe };
