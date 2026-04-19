const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access token tidak ditemukan"
        });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        const message = err.name === 'TokenExpiredError'
            ? "Access token sudah expired"
            : "Access token tidak valid";

        return res.status(403).json({ success: false, message });
    }
};

const checkRole = (...allowedRoles) => {
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase()); // dihitung sekali

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const userRoles = req.user.role_names
            ?? (req.user.role_name ? [req.user.role_name] : []);

        if (!userRoles.length) {
            return res.status(403).json({
                success: false,
                message: "Role tidak ditemukan di token"
            });
        }

        const hasRole = userRoles.some(r => normalizedAllowed.includes(r.toUpperCase()));

        if (!hasRole) {
            return res.status(403).json({
                success: false,
                message: `Akses ditolak. Dibutuhkan role: ${normalizedAllowed.join(", ")}`
            });
        }

        next();
    };
};

 
module.exports = { verifyToken, checkRole };