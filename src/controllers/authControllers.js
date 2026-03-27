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

    // Build map role
    _roleCache = roles.reduce((acc, role) => {
        acc[role.name.toUpperCase()] = { id: role.id, name: role.name };
        return acc;
    }, {});

    return _roleCache;
};

// Invalidate cache
const invalidateRoleCache = () => {
    _roleCache = null;
};

// Register
const register = async (req, res) => {
    try {
        const { email, password, role, guru_id } = req.body;

        // Validasi input wajib
        if (!email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Email, password, dan role wajib diisi",
            });
        }

        // Validasi format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Format email tidak valid",
            });
        }

        // Validasi password minimal 6 karakter
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password minimal 6 karakter",
            });
        }

        // Load role cache dari DB (lazy, sekali aja)
        const roleCache = await getRoleCache();
        const roleKey = role.toUpperCase();
        const validRoles = Object.keys(roleCache);

        if (!roleCache[roleKey]) {
            return res.status(400).json({
                success: false,
                message: `Role tidak valid. Pilihan yang tersedia: ${validRoles.join(", ")}`,
            });
        }

        const roleData = roleCache[roleKey]; // { id, name }

        // Cek duplikasi email (user aktif)
        const existingEmail = await prisma.user.findFirst({
            where: { email, deleted_at: null },
        });
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "Email sudah terdaftar",
            });
        }

        // Validasi guru_id kalau role GURU
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

        // Shared payload untuk create / restore
        const hashedPassword = await bcrypt.hash(password, 10);
        const userPayload = {
            password: hashedPassword,
            role_id: roleData.id,
            guru_id: roleKey === "GURU" && guru_id ? parseInt(guru_id, 10) : null,
        };

        // Cek soft-deleted user dengan email sama → restore
        const deletedUser = await prisma.user.findFirst({
            where: { email, deleted_at: { not: null } },
        });

        if (deletedUser) {
            const restoredUser = await prisma.user.update({
                where: { id: deletedUser.id },
                data: { deleted_at: null, ...userPayload },
                select: {
                    id: true,
                    email: true,
                    role_id: true,
                    role: {
                        select: {
                            id: true,
                            name: true,
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
                }
            });

            return res.status(200).json({
                success: true,
                message: "Berhasil mengembalikan user yang telah dihapus",
                data: restoredUser,
            });
        }

        // Buat user baru
        const newUser = await prisma.user.create({
            data: { email, ...userPayload },
            select: {
                id: true,
                email: true,
                role_id: true,
                role: {
                    select: {
                        id: true,
                        name: true,
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
            }
        });

        return res.status(201).json({
            success: true,
            message: "Registrasi berhasil",
            data: newUser,
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
                role: {
                    select: {
                        id: true,
                        name: true,
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

        // JWT payload bawa role_id (int) + role_name (string) sekaligus
        // → middleware bisa cek salah satu atau keduanya
        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role_id: user.role_id,
                role_name: user.role?.name?.toUpperCase() ?? null,
                guru_id: user.guru_id,
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        // Hapus password dari response
        const { password: _, ...userData } = user;

        return res.status(200).json({
            success: true,
            message: "Login berhasil",
            data: { user: userData, accessToken },
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
        // Karena menggunakan stateless JWT, logout dilakukan di client side
        // Client menghapus token dari storage mereka
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
        // req.user sudah di-set dari middleware verifyToken
        const user = await prisma.user.findFirst({
            where: { id: req.user.id, deleted_at: null },
            select: {
                id: true,
                email: true,
                role_id: true,
                role: {
                    select: {
                        id: true,
                        name: true,
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
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan",
            });
        }

        return res.status(200).json({
            success: true,
            data: user
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
    invalidateRoleCache, // export kalau sewaktu-waktu butuh refresh cache
};