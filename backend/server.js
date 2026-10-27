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

// ---------------------------------------------------------------------------
// MongoDB connection — cached promise pattern for serverless environments.
// On Vercel, requests are handled by ephemeral serverless functions.
// We must await connectDB() on incoming API requests rather than firing
// a floating promise at module startup.
// ---------------------------------------------------------------------------
let cachedPromise = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return;
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing from environment variables in Vercel");
    }
    if (!cachedPromise) {
        cachedPromise = mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        }).then((m) => {
            console.log("MongoDB connected");
            return m;
        }).catch((err) => {
            cachedPromise = null;
            throw err;
        });
    }
    return cachedPromise;
};

// Health-check (proves the backend service and reports DB connection & env vars)
app.get("/", async (req, res) => {
    const states = ["disconnected", "connected", "connecting", "disconnecting"];
    res.json({
        status: "ok",
        message: "Budget Tracker API is running",
        database: {
            state: states[mongoose.connection.readyState] || "unknown",
            hasMongoUri: Boolean(process.env.MONGO_URI),
            hasJwtSecret: Boolean(process.env.JWT_SECRET),
        },
    });
});

// Middleware: ensure MongoDB is connected before handling any /api requests
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error("MongoDB connection failed:", err.message);
        return res.status(500).json({
            message: "Database connection failed",
            error: err.message,
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/goals", goalRoutes);

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