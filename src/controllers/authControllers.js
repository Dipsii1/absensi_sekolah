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
// const register = async (req, res) => {
//     try {
//         const { email, password, role, guru_id, role_names } = req.body;

//         // Validasi input 
//         if (!email || !password || !role) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Email, password, dan role wajib diisi",
//             });
//         }

//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(email)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Format email tidak valid",
//             });
//         }

//         if (password.length < 6) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Password minimal 6 karakter",
//             });
//         }


//         const roleCache = await getRoleCache();

//         const normalizeRoleName = (r) => {
//             if (!r) return null;
//             const upper = String(r).trim().toUpperCase();
//             return upper === "WALI KELAS" ? "WALAS" : upper;
//         };

//         const requestedRaw = Array.isArray(role_names) && role_names.length
//             ? role_names
//             : [role];

//         const finalRoleNames = requestedRaw
//             .map(normalizeRoleName)
//             .filter(Boolean);

//         // Jika ada ADMIN, hanya ADMIN yang boleh
//         const resolvedRoles = finalRoleNames.includes("ADMIN")
//             ? ["ADMIN"]
//             : Array.from(new Set(finalRoleNames));

//         // Validasi semua role ada di cache
//         const invalidRoles = resolvedRoles.filter((r) => !roleCache[r]);
//         if (invalidRoles.length) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Role tidak valid: ${invalidRoles.join(", ")}. Pilihan: ${Object.keys(roleCache).join(", ")}`,
//             });
//         }

//         // ── Validasi guru (GURU atau WALAS keduanya butuh guru_id) ─────────
//         const needsGuru = resolvedRoles.includes("GURU") || resolvedRoles.includes("WALAS");

//         if (needsGuru) {
//             if (!guru_id) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Guru ID wajib diisi untuk role GURU/WALAS",
//                 });
//             }
//             if (isNaN(parseInt(guru_id))) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Guru ID harus berupa angka",
//                 });
//             }

//             const guruExists = await prisma.guru.findFirst({
//                 where: { id: parseInt(guru_id), deleted_at: null },
//             });
//             if (!guruExists) {
//                 return res.status(404).json({
//                     success: false,
//                     message: "Guru tidak ditemukan",
//                 });
//             }

//             const guruHasUser = await prisma.user.findFirst({
//                 where: { guru_id: parseInt(guru_id), deleted_at: null },
//             });
//             if (guruHasUser) {
//                 return res.status(409).json({
//                     success: false,
//                     message: "Guru sudah memiliki akun user",
//                 });
//             }
//         }

//         // cek email sipembuat akun sudah terdaftar (non-deleted)
//         const existingEmail = await prisma.user.findFirst({
//             where: { email, deleted_at: null },
//         });
//         if (existingEmail) {
//             return res.status(409).json({
//                 success: false,
//                 message: "Email sudah terdaftar",
//             });
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);
//         const guruIdValue = needsGuru && guru_id ? parseInt(guru_id, 10) : null;

//         // siapkan data userRole untuk create/update
//         const userRoleData = resolvedRoles.map((r) => ({ role_id: roleCache[r].id }));

//         // cek apakah ada user dengan email yang sama tapi sudah dihapus 
//         const deletedUser = await prisma.user.findFirst({
//             where: { email, deleted_at: { not: null } },
//         });

//         if (deletedUser) {
//             const restoredUser = await prisma.user.update({
//                 where: { id: deletedUser.id },
//                 data: {
//                     password: hashedPassword,
//                     guru_id: guruIdValue,
//                     deleted_at: null,
//                     userRole: {
//                         deleteMany: {},
//                         create: userRoleData,
//                     },
//                 },
//                 select: userSelect,
//             });

//             const roles = extractRoles(restoredUser.userRole);

//             return res.status(200).json({
//                 success: true,
//                 message: "Berhasil mengembalikan user yang telah dihapus",
//                 data: { ...restoredUser, roles },
//             });
//         }

//         // buat user baru
//         const newUser = await prisma.user.create({
//             data: {
//                 email,
//                 password: hashedPassword,
//                 guru_id: guruIdValue,
//                 userRole: {
//                     create: userRoleData,
//                 },
//             },
//             select: userSelect,
//         });

//         const roles = extractRoles(newUser.userRole);

//         return res.status(201).json({
//             success: true,
//             message: "Registrasi berhasil",
//             data: { ...newUser, roles },
//         });

//     } catch (error) {
//         console.error("Error in register:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Terjadi kesalahan pada server",
//             error: error.message,
//         });
//     }
// };

// Login
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username dan password wajib diisi",
            });
        }

        // Autentikasi ke YSBO API
        let ysboData;
        try {
            const ysboResponse = await fetch(process.env.YSBO_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    version: "v1",
                    apps_name: "TB Attendance",
                    username: username,
                    password,
                }),
            });

            ysboData = await ysboResponse.json();

            if (ysboData.status_code !== 200) {
                return res.status(401).json({
                    success: false,
                    message: ysboData.message || "Username atau password salah",
                });
            }
        } catch (fetchError) {
            console.error("YSBO API unreachable:", fetchError);
            return res.status(503).json({
                success: false,
                message: "Layanan autentikasi eksternal tidak tersedia",
            });
        }

        const ysboUser = ysboData.data;

        // Cari user lokal berdasarkan username dari YSBO
        let user = await prisma.user.findFirst({
            where: { username: ysboUser.username, deleted_at: null },
            include: {
                userRole: {
                    include: {
                        role: { select: { id: true, name: true } },
                    },
                },
                guru: {
                    select: {
                        id: true,
                        NIP: true,
                        nama: true,
                        nomor_telepon: true,
                    },
                },
            },
        });

        // Jika user belum ada, auto-register
        if (!user) {
            const roleCache = await getRoleCache();
            const defaultRole = roleCache["GURU"];

            if (!defaultRole) {
                return res.status(500).json({
                    success: false,
                    message: "Role default tidak ditemukan di database",
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Buat Guru placeholder dulu, lalu User yang terhubung ke Guru
            user = await prisma.$transaction(async (tx) => {
                // Buat record Guru dengan data placeholder
                const guruBaru = await tx.guru.create({
                    data: {
                        NIP: `YSBO-${ysboUser.username}`,        
                        nama: ysboUser.username,                 
                        nomor_telepon: "-",                       
                        alamat: "-",                              
                        tanggal_lahir: new Date("2000-01-01"),   
                    },
                });

                //  Buat User dan langsung hubungkan ke Guru
                return await tx.user.create({
                    data: {
                        username: ysboUser.username,
                        email: ysboUser.email ?? null,
                        password: hashedPassword,
                        guru_id: guruBaru.id,
                        userRole: {
                            create: [{ role_id: defaultRole.id }],
                        },
                    },
                    include: {
                        userRole: {
                            include: {
                                role: { select: { id: true, name: true } },
                            },
                        },
                        guru: {
                            select: {
                                id: true,
                                NIP: true,
                                nama: true,
                                nomor_telepon: true,
                            },
                        },
                    },
                });
            });
        }

        const roles = extractRoles(user.userRole);

        const accessToken = jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email,
                role_ids: roles.map((r) => r.id),
                role_names: roles.map((r) => r.name.toUpperCase()),
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
                accessToken,
                ysboToken: ysboUser.token ?? null,
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
    // register,
    login,
    logout,
    me,
    invalidateRoleCache,
};