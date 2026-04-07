const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");

// ─── Role Cache  ───────────────
// Schema: Role { id, name } — relasi ke User lewat tabel userRole (many-to-many)

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

const invalidateRoleCache = () => { _roleCache = null; };

// Helper: format output user agar role mudah dibaca
const formatUser = (user) => {
    const { userRole, ...rest } = user;
    return {
        ...rest,
        roles: userRole.map(ur => ur.role),
        role: userRole[0]?.role ?? null,
    };
};

//  Get All Users 

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
                    email: true,
                    guru_id: true,
                    userRole: {
                        select: {
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
                    deleted_at: true,
                }
            }),
            prisma.user.count({ where: whereCondition }),
        ]);

        return res.json({
            success: true,
            data: data.map(formatUser),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
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

//  Get User By ID  

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findFirst({
            where: { id, deleted_at: null },
            select: {
                id: true,
                email: true,
                guru_id: true,
                userRole: {
                    select: {
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
                deleted_at: true,
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
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User tidak ditemukan" });
        }

        return res.json({ success: true, data: formatUser(user) });

    } catch (error) {
        console.error("Error in getUserById:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

//   Create User 

const createUser = async (req, res) => {
    try {
        const { email, password, role, guru_id } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Email, password, dan role wajib diisi"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Format email tidak valid" });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password minimal 6 karakter" });
        }

        // Validasi role
        const roleCache = await getRoleCache();
        const roleKey = role.toUpperCase();

        if (!roleCache[roleKey]) {
            return res.status(400).json({
                success: false,
                message: `Role tidak valid. Pilihan: ${Object.keys(roleCache).join(", ")}`
            });
        }

        const roleData = roleCache[roleKey];

        // Cek duplikat email
        const existingEmail = await prisma.user.findFirst({
            where: { email, deleted_at: null }
        });

        if (existingEmail) {
            return res.status(409).json({ success: false, message: "Email sudah digunakan" });
        }

        // Validasi guru jika role GURU
        if (roleKey === "GURU") {
            if (!guru_id || isNaN(parseInt(guru_id))) {
                return res.status(400).json({
                    success: false,
                    message: "Guru ID wajib diisi dan harus angka untuk role GURU"
                });
            }

            const guruExists = await prisma.guru.findFirst({
                where: { id: parseInt(guru_id), deleted_at: null }
            });

            if (!guruExists) {
                return res.status(404).json({ success: false, message: "Guru tidak ditemukan" });
            }

            const guruHasUser = await prisma.user.findFirst({
                where: { guru_id: parseInt(guru_id), deleted_at: null }
            });

            if (guruHasUser) {
                return res.status(409).json({
                    success: false,
                    message: "Guru sudah memiliki akun"
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        //  Buat user + userRole dalam satu transaksi
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                guru_id: roleKey === "GURU" ? parseInt(guru_id) : null,
                userRole: {
                    create: {
                        role_id: roleData.id   // insert ke tabel user_roles
                    }
                }
            },
            select: {
                id: true,
                email: true,
                guru_id: true,
                userRole: {
                    select: {
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
                deleted_at: true,
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
            }
        });

        return res.status(201).json({
            success: true,
            message: "Berhasil membuat user",
            data: formatUser(newUser)
        });

    } catch (error) {
        console.error("Error in createUser:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

//  Update User

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

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Format email tidak valid" });
        }

        // Validasi role
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
            return res.status(404).json({ success: false, message: "User tidak ditemukan" });
        }

        // Cek duplikat email
        const duplicateEmail = await prisma.user.findFirst({
            where: { email, deleted_at: null, NOT: { id } }
        });

        if (duplicateEmail) {
            return res.status(409).json({
                success: false,
                message: "Email sudah digunakan user lain"
            });
        }

        // Validasi guru
        if (roleKey === "GURU") {
            if (!guru_id || isNaN(parseInt(guru_id))) {
                return res.status(400).json({
                    success: false,
                    message: "Guru ID wajib diisi dan harus angka untuk role GURU"
                });
            }

            const guruExists = await prisma.guru.findFirst({
                where: { id: parseInt(guru_id), deleted_at: null }
            });

            if (!guruExists) {
                return res.status(404).json({ success: false, message: "Guru tidak ditemukan" });
            }

            const guruHasUser = await prisma.user.findFirst({
                where: { guru_id: parseInt(guru_id), deleted_at: null, NOT: { id } }
            });

            if (guruHasUser) {
                return res.status(409).json({
                    success: false,
                    message: "Guru sudah punya akun lain"
                });
            }
        }

        // Build update data
        const updateData = {
            email,
            guru_id: roleKey === "GURU" ? parseInt(guru_id) : null,
            updated_at: new Date(),
        };

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password minimal 6 karakter"
                });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        //  Update user + ganti role di userRole (delete lama, insert baru)
        const updatedUser = await prisma.$transaction(async (tx) => {
            await tx.userRole.deleteMany({ where: { user_id: id } });

            return tx.user.update({
                where: { id },
                data: {
                    ...updateData,
                    userRole: {
                        create: { role_id: roleData.id }
                    }
                },
                select: {
                    id: true,
                    email: true,
                    guru_id: true,
                    userRole: {
                        select: {
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
                    deleted_at: true,
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
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil update user",
            data: formatUser(updatedUser)
        });

    } catch (error) {
        console.error("Error in updateUser:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// Delete User (Soft Delete)  

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const existingUser = await prisma.user.findFirst({
            where: { id, deleted_at: null }
        });

        if (!existingUser) {
            return res.status(404).json({ success: false, message: "User tidak ditemukan" });
        }

        await prisma.user.update({
            where: { id },
            data: { deleted_at: new Date() }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil menghapus data user"
        });

    } catch (error) {
        console.error("Error in deleteUser:", error);
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
    createUser,
    updateUser,
    deleteUser,
    invalidateRoleCache,
};