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


// GET ALL USERS
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const whereCondition = { deleted_at: null };

        const [data, total] = await Promise.all([
            prisma.user.findMany({
                where: whereCondition,
                skip,
                take: limit,
                orderBy: { created_at: "desc" },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    guru_id: true,
                    userRole: {
                        include: {
                            role: { select: { id: true, name: true } }
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
            prisma.user.count({ where: whereCondition })
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


// GET USER BY ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findFirst({
            where: { id, deleted_at: null },
            select: {
                id: true,
                username: true,
                email: true,
                guru_id: true,
                userRole: {
                    include: {
                        role: { select: { id: true, name: true } }
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


// UPDATE USER

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password, role, guru_id, role_names } = req.body;

        // Validasi field
        if (!username || !role) {
            return res.status(400).json({
                success: false,
                message: "Username dan role wajib diisi"
            });
        }

        // Validasi format email jika email dikirim
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Format email tidak valid"
                });
            }
        }

        // Role mapping
        const roleCache = await getRoleCache();

        const normalizeRoleName = (r) => {
            if (!r) return null;
            const upper = String(r).trim().toUpperCase();
            return upper === "WALI KELAS" ? "WALAS" : upper;
        };

        const requestedRoleNamesRaw = Array.isArray(role_names) && role_names.length
            ? role_names
            : [role];

        const requestedRoleNames = requestedRoleNamesRaw
            .map(normalizeRoleName)
            .filter(Boolean);

        // Jika ada ADMIN, pastikan hanya ADMIN yang dipilih
        const finalRoleNames = requestedRoleNames.includes("ADMIN")
            ? ["ADMIN"]
            : Array.from(new Set(requestedRoleNames));

        const invalidRoles = finalRoleNames.filter((r) => !roleCache[r]);
        if (invalidRoles.length) {
            return res.status(400).json({
                success: false,
                message: `Role tidak valid: ${invalidRoles.join(", ")}. Pilihan: ${Object.keys(roleCache).join(", ")}`
            });
        }

        // Cek user ada
        const existingUser = await prisma.user.findFirst({
            where: { id, deleted_at: null },
            include: {
                userRole: {
                    include: {
                        role: { select: { id: true, name: true } }
                    }
                }
            }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan"
            });
        }

        const existingRoleNames = (existingUser.userRole || [])
            .map((ur) => normalizeRoleName(ur?.role?.name))
            .filter(Boolean);

        // Jika user sudah punya role ADMIN, rolenya tidak bisa diubah
        if (existingRoleNames.includes("ADMIN")) {
            if (!(finalRoleNames.length === 1 && finalRoleNames[0] === "ADMIN")) {
                return res.status(403).json({
                    success: false,
                    message: "User dengan role ADMIN tidak dapat diubah rolenya"
                });
            }
        }

        // cek duplicate username
        const duplicateUsername = await prisma.user.findFirst({
            where: {
                username,
                deleted_at: null,
                NOT: { id }
            }
        });

        if (duplicateUsername) {
            return res.status(409).json({
                success: false,
                message: "Username sudah digunakan user lain"
            });
        }

        // Cek duplicate email (hanya jika email dikirim)
        if (email) {
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
        }

        // Validasi guru
        const isGuru = finalRoleNames.includes("GURU");
        if (isGuru) {
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
                where: { id: parseInt(guru_id), deleted_at: null }
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

        // Build updateData
        const updateData = {
            username,
            email: email || null,
            guru_id: isGuru ? parseInt(guru_id) : null,
            updated_at: new Date()
        };

        // Password optional, hanya diupdate jika dikirim
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password minimal 6 karakter"
                });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Jalankan update dalam transaksi
        const updatedUser = await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: updateData
            });

            const desiredRoleIds = finalRoleNames.map((r) => roleCache[r].id);

            await tx.userRole.deleteMany({
                where: {
                    user_id: id,
                    role_id: { notIn: desiredRoleIds }
                }
            });

            await tx.userRole.createMany({
                data: desiredRoleIds.map((rid) => ({ user_id: id, role_id: rid })),
                skipDuplicates: true
            });

            return tx.user.findFirst({
                where: { id },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    guru_id: true,
                    userRole: {
                        include: {
                            role: { select: { id: true, name: true } }
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


// DELETE USER (soft delete)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const existingUser = await prisma.user.findFirst({
            where: { id, deleted_at: null }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan"
            });
        }

        await prisma.$transaction([
            prisma.userRole.deleteMany({ where: { user_id: id } }),
            prisma.user.update({
                where: { id },
                data: { deleted_at: new Date() }
            })
        ]);

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