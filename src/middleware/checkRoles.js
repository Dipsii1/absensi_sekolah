const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const userRole = req.user.role_name?.toUpperCase();

        if (!userRole) {
            return res.status(403).json({
                success: false,
                message: "Role tidak ditemukan di token"
            });
        }

        const normalizedRoles = allowedRoles.map(r => r.toUpperCase());

        if (!normalizedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `Akses ditolak. Dibutuhkan role: ${normalizedRoles.join(", ")}`
            });
        }

        next();
    };
};

module.exports = checkRole;