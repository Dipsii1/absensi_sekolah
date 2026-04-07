const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let _roleCache = null;

const getRoleCache = async () => {
    if (_roleCache) return _roleCache;

    const roles = await prisma.role.findMany();

    if (!roles.length) {
        throw new Error("Tabel roles kosong. Pastikan data master roles sudah diisi.");
    }

    _roleCache = roles.reduce((acc, role) => {
        acc[role.name.toUpperCase()] = { id: role.id, name: role.name };
        return acc;
    }, {});

    return _roleCache;
};

const invalidateRoleCache = () => {
    _roleCache = null;
};

// Helper: select user dengan userRole
const userSelect = {
    id: true,
    email: true,
    userRole: {
        include: {
            role: {
                select: { id: true, name: true }
            }
        }
    },
    guru_id: true,
    guru: {
        select: {
            id: true,
            NIP: true,
            nama: true,
            nomor_telepon: true,
        }
    },
    created_at: true,
    updated_at: true,
    deleted_at: true,
};

// Helper: ambil semua roles dari userRole array
const extractRoles = (userRole) => userRole?.map(ur => ur.role) ?? [];

// Register
const register = async (req, res) => {
    try {
        const { email, password, role, guru_id } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Email, password, dan role wajib diisi",
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Format email tidak valid",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password minimal 6 karakter",
            });
        }

        const roleCache = await getRoleCache();
        const roleKey = role.toUpperCase();

        if (!roleCache[roleKey]) {
            return res.status(400).json({
                success: false,
                message: `Role tidak valid. Pilihan yang tersedia: ${Object.keys(roleCache).join(", ")}`,
            });
        }

        const roleData = roleCache[roleKey];

        const existingEmail = await prisma.user.findFirst({
            where: { email, deleted_at: null },
        });
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "Email sudah terdaftar",
            });
        }

        if (roleKey === "GURU") {
            if (!guru_id) {
                return res.status(400).json({
                    success: false,
                    message: "Guru ID wajib diisi untuk role GURU",
                });
            }
            if (isNaN(parseInt(guru_id))) {
                return res.status(400).json({
                    success: false,
                    message: "Guru ID harus berupa angka",
                });
            }

            const guruExists = await prisma.guru.findFirst({
                where: { id: parseInt(guru_id), deleted_at: null },
            });
            if (!guruExists) {
                return res.status(404).json({
                    success: false,
                    message: "Guru tidak ditemukan",
                });
            }

            const guruHasUser = await prisma.user.findFirst({
                where: { guru_id: parseInt(guru_id), deleted_at: null },
            });
            if (guruHasUser) {
                return res.status(409).json({
                    success: false,
                    message: "Guru sudah memiliki akun user",
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const guruIdValue = roleKey === "GURU" && guru_id ? parseInt(guru_id, 10) : null;

        // Cek soft-deleted user → restore
        const deletedUser = await prisma.user.findFirst({
            where: { email, deleted_at: { not: null } },
        });

        if (deletedUser) {
            const restoredUser = await prisma.user.update({
                where: { id: deletedUser.id },
                data: {
                    password: hashedPassword,
                    guru_id: guruIdValue,
                    deleted_at: null,
                    userRole: {
                        deleteMany: {},
                        create: { role_id: roleData.id }
                    }
                },
                select: userSelect,
            });

            const roles = extractRoles(restoredUser.userRole);

            return res.status(200).json({
                success: true,
                message: "Berhasil mengembalikan user yang telah dihapus",
                data: { ...restoredUser, roles },
            });
        }

        // Buat user baru
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                guru_id: guruIdValue,
                userRole: {
                    create: { role_id: roleData.id }
                }
            },
            select: userSelect,
        });

        const roles = extractRoles(newUser.userRole);

        return res.status(201).json({
            success: true,
            message: "Registrasi berhasil",
            data: { ...newUser, roles },
        });

    } catch (error) {
        console.error("Error in register:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message,
        });
    }
};

// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email dan password wajib diisi",
            });
        }

        const user = await prisma.user.findFirst({
            where: { email, deleted_at: null },
            include: {
                userRole: {
                    include: {
                        role: {
                            select: { id: true, name: true }
                        }
                    }
                },
                guru: {
                    select: {
                        id: true,
                        NIP: true,
                        nama: true,
                        nomor_telepon: true,
                    }
                },
            },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email atau password salah",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Email atau password salah",
            });
        }

        const roles = extractRoles(user.userRole);

        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                // Array semua role_id yang dimiliki user
                role_ids: roles.map(r => r.id),
                // Array semua role_name uppercase
                role_names: roles.map(r => r.name.toUpperCase()),
                guru_id: user.guru_id,
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        const { password: _, ...userData } = user;

        return res.status(200).json({
            success: true,
            message: "Login berhasil",
            data: {
                user: { ...userData, roles },
                accessToken
            },
        });

    } catch (error) {
        console.error("Error in login:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message,
        });
    }
};

// Logout
const logout = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Logout berhasil"
        });
    } catch (error) {
        console.error("Error in logout:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message,
        });
    }
};

// Get Current User
const me = async (req, res) => {
    try {
        const user = await prisma.user.findFirst({
            where: { id: req.user.id, deleted_at: null },
            select: userSelect,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan",
            });
        }

        const roles = extractRoles(user.userRole);

        return res.status(200).json({
            success: true,
            data: { ...user, roles },
        });

    } catch (error) {
        console.error("Error in me:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message,
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    me,
    invalidateRoleCache,
};