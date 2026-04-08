const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");

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

// get all users
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const whereCondition = {
            deleted_at: null
        };

        const [data, total] = await Promise.all([
            prisma.user.findMany({
                where: whereCondition,
                skip,
                take: limit,
                orderBy: {
                    created_at: "desc"
                },
                select: {
                    id: true,
                    email: true,
                    guru_id: true,
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
                            nomor_telepon: true
                        }
                    },
                    created_at: true,
                    updated_at: true,
                    deleted_at: true
                }
            }),
            prisma.user.count({
                where: whereCondition
            })
        ]);

        return res.json({
            success: true,
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error in getAllUsers:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// get user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findFirst({
            where: {
                id,
                deleted_at: null
            },
            select: {
                id: true,
                email: true,
                guru_id: true,
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
                        alamat: true,
                        tanggal_lahir: true
                    }
                },
                created_at: true,
                updated_at: true,
                deleted_at: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan"
            });
        }

        return res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error("Error in getUserById:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, role, guru_id } = req.body;

        if (!email || !role) {
            return res.status(400).json({
                success: false,
                message: "Email dan role wajib diisi"
            });
        }

        // Validasi email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Format email tidak valid"
            });
        }

        // Role mapping
        const roleCache = await getRoleCache();
        const roleKey = role.toUpperCase();

        if (!roleCache[roleKey]) {
            return res.status(400).json({
                success: false,
                message: `Role tidak valid. Pilihan: ${Object.keys(roleCache).join(", ")}`
            });
        }

        const roleData = roleCache[roleKey];

        // Cek user
        const existingUser = await prisma.user.findFirst({
            where: { id, deleted_at: null }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan"
            });
        }

        // Cek duplicate email
        const duplicateEmail = await prisma.user.findFirst({
            where: {
                email,
                deleted_at: null,
                NOT: { id }
            }
        });

        if (duplicateEmail) {
            return res.status(409).json({
                success: false,
                message: "Email sudah digunakan user lain"
            });
        }

        // Validasi guru
        if (roleKey === "GURU") {
            if (!guru_id) {
                return res.status(400).json({
                    success: false,
                    message: "Guru ID wajib diisi untuk role GURU"
                });
            }

            if (isNaN(parseInt(guru_id))) {
                return res.status(400).json({
                    success: false,
                    message: "Guru ID harus angka"
                });
            }

            const guruExists = await prisma.guru.findFirst({
                where: {
                    id: parseInt(guru_id),
                    deleted_at: null
                }
            });

            if (!guruExists) {
                return res.status(404).json({
                    success: false,
                    message: "Guru tidak ditemukan"
                });
            }

            const guruHasUser = await prisma.user.findFirst({
                where: {
                    guru_id: parseInt(guru_id),
                    deleted_at: null,
                    NOT: { id }
                }
            });

            if (guruHasUser) {
                return res.status(409).json({
                    success: false,
                    message: "Guru sudah punya akun lain"
                });
            }
        }

        // Build data update untuk tabel users
        const updateData = {
            email,
            guru_id: roleKey === "GURU" ? parseInt(guru_id) : null,
            updated_at: new Date()
        };

        // Password optional
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password minimal 6 karakter"
                });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Jalankan update user + update userRole dalam satu transaksi
        const updatedUser = await prisma.$transaction(async (tx) => {
            // Update data user
            await tx.user.update({
                where: { id },
                data: updateData
            });

            // Hapus semua role lama lalu insert role baru
            await tx.userRole.deleteMany({
                where: { user_id: id }
            });

            await tx.userRole.create({
                data: {
                    user_id: id,
                    role_id: roleData.id
                }
            });

            // Ambil data user terbaru dengan relasi lengkap
            return tx.user.findFirst({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    guru_id: true,
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
                            nomor_telepon: true
                        }
                    },
                    created_at: true,
                    updated_at: true,
                    deleted_at: true
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil update user",
            data: updatedUser
        });

    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// delete user (soft delete)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const existingUser = await prisma.user.findFirst({
            where: {
                id,
                deleted_at: null
            }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan"
            });
        }

        await prisma.user.update({
            where: { id },
            data: {
                deleted_at: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil menghapus data user"
        });

    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    invalidateRoleCache
};