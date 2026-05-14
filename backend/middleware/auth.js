import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = async (req, res, next) => {
    const token = req.cookies?.accessToken;

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;

        const user = await User.findById(req.userId).populate('role', 'roleName');
        if (!user) {
            return res.status(401).json({ message: "Unauthorized: User not found" });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Forbidden: Account is inactive" });
        }

        // Đính kèm thông tin user vào request để dùng ở controller/service
        req.user = {
            id: user._id,
            username: user.username,
            fullName: user.fullName,
            role: user.role?.roleName || 'staff'
        };

        next();
    } catch (err) {
        console.error('[verifyToken] Error:', err.message);
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};
