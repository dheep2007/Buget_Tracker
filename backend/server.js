require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();

// Allow requests from local dev and the deployed GitHub Pages frontend
app.use(cors({
    origin: [
        'http://localhost:5173',
        process.env.CLIENT_URL,
    ].filter(Boolean), // remove undefined if CLIENT_URL is not set
    credentials: true,
}));
app.use(express.json()); // lets Express read JSON sent in request bodies

app.get("/", (req, res) => {
    res.send("Budget Tracker API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
const dashboardRoutes = require("./routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);
const goalRoutes = require("./routes/goalRoutes");
app.use("/api/goals", goalRoutes);

const PORT = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err.message);
    });