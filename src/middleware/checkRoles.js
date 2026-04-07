const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // Support multi-role (role_names) maupun single-role lama (role_name)
        const userRoles = req.user.role_names
            ?? (req.user.role_name ? [req.user.role_name] : []);

        if (!userRoles.length) {
            return res.status(403).json({
                success: false,
                message: "Role tidak ditemukan di token"
            });
        }

        const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

        // Lolos jika minimal satu role user ada di allowedRoles
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

module.exports = checkRole;