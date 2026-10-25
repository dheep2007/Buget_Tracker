const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // 1. The header must look like: "Bearer <token>"
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Not authorized, no token" });
        }

        const token = authHeader.split(" ")[1];

        // 2. Verify signature and expiry. Throws an error if invalid.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Find the user from the id stored in the token
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "Not authorized, user not found" });
        }

        // 4. Attach the user to the request and continue
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Not authorized, token invalid or expired" });
    }
};

module.exports = { protect };