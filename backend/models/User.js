const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
            select: false, // never return the password when we fetch a user
        },
    },
    { timestamps: true } // adds createdAt and updatedAt automatically
);

// Runs automatically BEFORE a user is saved: hash the password
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return; // only hash if password changed
    this.password = await bcrypt.hash(this.password, 10);
});

// Helper to compare a typed password with the stored hash (used at login)
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);