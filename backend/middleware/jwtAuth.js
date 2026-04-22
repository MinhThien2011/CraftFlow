import jwt from "jsonwebtoken";

export const jwtAuth = (req, res, next) => {
    const token = req.cookies?.accessToken

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        if (!req.userId) {
            console.log('[jwtAuth] userId is empty');
            return res.status(401).json({ message: "Unauthorized" });
        }
        next();
    } catch (err) {
        return res.status(401).json({ message: "Unauthorized", err: err.message });
    }
}