require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const goalRoutes = require("./routes/goalRoutes");

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    "https://tracker-frontend1.vercel.app", // deployed frontend
    process.env.CLIENT_URL,                 // optional override via Vercel env var
].filter(Boolean);

const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

// Handle OPTIONS preflight requests immediately (must be before other routes)
// NOTE: Express 5 requires named wildcards — bare "*" throws PathError [TypeError]
app.options("/*splat", cors(corsOptions));

// Apply CORS to all subsequent routes
app.use(cors(corsOptions));

app.use(express.json());

// Health-check (also proves the backend service is reachable)
app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Budget Tracker API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/goals", goalRoutes);

// ---------------------------------------------------------------------------
// MongoDB connection — initiated here so it is ready as early as possible.
// We do NOT nest app.listen() inside .then() because on Vercel the module
// must export 'app' immediately; the DB connects in the background.
// ---------------------------------------------------------------------------
let dbConnected = false;

const connectDB = async () => {
    if (dbConnected) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        dbConnected = true;
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection error:", err.message);
    }
};

connectDB(); // Start connecting now (non-blocking for the export below)

// ---------------------------------------------------------------------------
// Local development: start the HTTP server only when running with Node directly
// (i.e. NOT inside Vercel's serverless runtime).
// On Vercel, the platform itself routes incoming HTTP requests to the exported
// 'app', so calling app.listen() there is both unnecessary and problematic.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// ---------------------------------------------------------------------------
// CRITICAL: export the Express app so Vercel's serverless runtime can
// find and call it. Without this line Vercel logs "No exports found in module"
// and returns HTTP 500 for every request.
// ---------------------------------------------------------------------------
module.exports = app;