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
    username: true,
    userRole: {
        include: {
            role: {
                select: { id: true, name: true }
            }
        }
    },
    pokjaUser: {
        select: {
            user_id: true,
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
    siswa_id: true,
    siswa: {
        select: {
            id: true,
            nama: true,
            nisn: true,
            nipd: true,
            nik: true,
            jenis_kelamin: true,
            jurusan: true,
            status_siswa: true,
            kelas_id: true,
            kelas: {
                select: {
                    id: true,
                    kelas: true,
                    jurusan: true,
                    walas: {
                        select: { id: true, nama: true }
                    },
                    tahun: {
                        select: { tahun_ajaran: true, is_active: true }
                    },
                }
            },
            rfid: {
                where: { is_active: true, deleted_at: null },
                select: { id: true, uid_rfid: true },
                take: 1,
            },
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

const moodleRestCall = async (token, wsfunction, params = {}) => {
    const url = new URL(`${process.env.MOODLE_BASE_URL}/webservice/rest/server.php`);
    url.searchParams.set("wstoken", token);
    url.searchParams.set("wsfunction", wsfunction);
    url.searchParams.set("moodlewsrestformat", "json");

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const data = await response.json();

    if (data && data.exception) {
        throw new Error(`[${data.errorcode}] ${data.message}`);
    }

    return data;
};

// Helper: ambil nama asli siswa dari profil Moodle
const getMoodleProfile = async (token) => {
    try {
        const siteInfo = await moodleRestCall(token, "core_webservice_get_site_info");
        return { nama: siteInfo?.fullname || null };
    } catch (err) {
        console.error("Gagal ambil profil Moodle:", err.message);
        return null;
    }
};

// Login siswa - ROUTE HANDLER, langsung fetch ke Moodle di dalam sini
const loginSiswa = async (req, res) => {
    try {
        const { username, password } = req.body;
 
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username dan password wajib diisi",
            });
        }
 
        let moodleData;
 
        try {
            const params = new URLSearchParams();
            params.append("username", username);
            params.append("password", password);
            params.append("service", "moodle_mobile_app");
 
            const moodleResponse = await fetch(`${process.env.MOODLE_BASE_URL}/login/token.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params,
                signal: AbortSignal.timeout(10000),
            });
 
            moodleData = await moodleResponse.json();
        } catch (err) {
            console.error("Moodle API Error:", err.message);
            return res.status(502).json({
                success: false,
                message: "Tidak dapat menghubungi server Moodle",
            });
        }
 
        if (!moodleData?.token) {
            return res.status(401).json({
                success: false,
                message: moodleData?.error || "Username atau password salah",
            });
        }
 
        // Role SISWA wajib ada di tabel roles sebelum siswa bisa login
        const roleCache = await getRoleCache();
        const siswaRole = roleCache["SISWA"];
 
        if (!siswaRole) {
            return res.status(500).json({
                success: false,
                message: "Role SISWA belum terdaftar di tabel roles. Tambahkan role ini dulu sebelum siswa bisa login.",
            });
        }

        // username di form login siswa = NIPD / NISN / username Moodle
        const nipd = username;

        // Cari siswa berdasarkan NIPD, NISN, atau username/email di tabel User
        let siswa = await prisma.siswa.findFirst({
            where: {
                OR: [
                    { nipd: username },
                    { nisn: username },
                    { user: { username: username } },
                    { user: { email: username } },
                ],
                deleted_at: null,
            },
            include: { user: true },
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        if (!siswa) {
            // Ambil nama asli dari profil Moodle (kalau tersedia)
            const moodleProfile = await getMoodleProfile(moodleData.token);
            const namaSiswa = moodleProfile?.nama || nipd;

            // Cek apakah user dengan username ini sudah ada sebelumnya
            const existingUser = await prisma.user.findFirst({
                where: { username: nipd },
            });

            // Jika siswa belum ada, buat baru (siswa + user) dalam satu transaksi
            const result = await prisma.$transaction(async (tx) => {
                const siswaBaru = await tx.siswa.create({
                    data: {
                        nama: namaSiswa,
                        nisn: `NISN-${nipd}`,
                        nipd: nipd,
                        nik: `NIK-${nipd}`,
                        tempat_lahir: "-",
                        tgl_lahir: new Date("2000-01-01"),
                        jenis_kelamin: "L",
                        agama: "-",
                        jurusan: "-",
                    },
                });

                let userBaru;
                if (existingUser) {
                    userBaru = await tx.user.update({
                        where: { id: existingUser.id },
                        data: {
                            siswa_id: siswaBaru.id,
                            password: hashedPassword,
                            deleted_at: null,
                        },
                    });
                } else {
                    userBaru = await tx.user.create({
                        data: {
                            username: nipd,
                            password: hashedPassword,
                            siswa_id: siswaBaru.id,
                            userRole: {
                                create: [{ role_id: siswaRole.id }],
                            },
                        },
                    });
                }

                return { siswaBaru, userBaru };
            });

            siswa = { ...result.siswaBaru, user: result.userBaru };
        } else {
            // Siswa ditemukan di database! Pastikan relasi ke User sudah terhubung.
            let userTerkait = siswa.user || await prisma.user.findFirst({
                where: {
                    OR: [
                        { username: nipd },
                        { siswa_id: siswa.id },
                    ],
                },
            });

            if (!userTerkait) {
                // Buat user baru untuk siswa ini
                userTerkait = await prisma.user.create({
                    data: {
                        username: nipd,
                        password: hashedPassword,
                        siswa_id: siswa.id,
                        userRole: {
                            create: [{ role_id: siswaRole.id }],
                        },
                    },
                });
            } else {
                // User sudah ada -> pastikan siswa_id terisi & deleted_at null
                userTerkait = await prisma.user.update({
                    where: { id: userTerkait.id },
                    data: {
                        siswa_id: siswa.id,
                        password: hashedPassword,
                        deleted_at: null,
                    },
                });

                // Pastikan role SISWA ada
                const existingRole = await prisma.userRole.findUnique({
                    where: {
                        user_id_role_id: {
                            user_id: userTerkait.id,
                            role_id: siswaRole.id,
                        },
                    },
                });

                if (!existingRole) {
                    await prisma.userRole.create({
                        data: {
                            user_id: userTerkait.id,
                            role_id: siswaRole.id,
                        },
                    });
                }
            }

            siswa.user = userTerkait;
        }

        const userWithRoles = await prisma.user.findFirst({
            where: { id: siswa.user.id },
            select: userSelect,
        });

        const roles = extractRoles(userWithRoles.userRole);

        const accessToken = jwt.sign(
            {
                id: userWithRoles.id,
                username: userWithRoles.username,
                role_ids: roles.map((r) => r.id),
                role_names: roles.map((r) => r.name.toUpperCase()),
                siswa_id: siswa.id,
                moodle_token: moodleData.token,
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );
 
        const { password: _pw, ...userData } = userWithRoles;
 
        return res.status(200).json({
            success: true,
            message: "Login berhasil",
            data: {
                user: {
                    ...userData,
                    roles,
                },
                accessToken,
                login_source: "MOODLE",
            },
        });
    } catch (error) {
        console.error("Error in loginSiswa:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message,
        });
    }
};

// Login guru
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username dan password wajib diisi",
            });
        }

        let user = null;
        let ysboUser = null;
        let ysboSuccess = false;

        try {
            const ysboResponse = await fetch(`${process.env.YSBO_API_BASE_URL}/Auth/signIn-ysbmo`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    version: "v1",
                    apps_name: "TB Attendance",
                    username,
                    password,
                }),
            });

            const ysboData = await ysboResponse.json();

            if (ysboData.status_code === 200) {
                ysboSuccess = true;
                ysboUser = ysboData.data;
            }
        } catch (err) {
            console.error("YSBO API Error:", err.message);
        }

        if (ysboSuccess) {
            // Cari user TERMASUK yang sudah soft-deleted (bukan pakai deleted_at: null)
            user = await prisma.user.findFirst({
                where: {
                    username: ysboUser.username,
                },
                include: {
                    userRole: {
                        include: {
                            role: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
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

            if (!user) {
                // User belum ada → buat baru (guru + user)
                const roleCache = await getRoleCache();
                const defaultRole = roleCache["GURU"];

                const hashedPassword = await bcrypt.hash(password, 10);

                user = await prisma.$transaction(async (tx) => {
                    const guruBaru = await tx.guru.create({
                        data: {
                            NIP: `YSBO-${ysboUser.username}`,
                            nama: ysboUser.username,
                            nomor_telepon: "-",
                            alamat: "-",
                            tanggal_lahir: new Date("2000-01-01"),
                        },
                    });

                    return await tx.user.create({
                        data: {
                            username: ysboUser.username,
                            email: ysboUser.email ?? null,
                            password: hashedPassword,
                            guru_id: guruBaru.id,
                            userRole: {
                                create: [
                                    {
                                        role_id: defaultRole.id,
                                    },
                                ],
                            },
                        },
                        include: {
                            userRole: {
                                include: {
                                    role: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
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
            } else if (user.deleted_at !== null) {
                // User ada tapi sudah di-hapus → RESTORE akun
                const roleCache = await getRoleCache();
                const defaultRole = roleCache["GURU"];
                const hashedPassword = await bcrypt.hash(password, 10);

                // Reset deleted_at dan password
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        deleted_at: null,
                        password: hashedPassword,
                    },
                    include: {
                        userRole: {
                            include: {
                                role: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
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

                // Reset role ke default GURU
                await prisma.userRole.deleteMany({ where: { user_id: user.id } });
                await prisma.userRole.create({
                    data: {
                        user_id: user.id,
                        role_id: defaultRole.id,
                    },
                });

                // Reset cache role
                invalidateRoleCache();
            }
            // Jika user ada dan tidak deleted → lanjut login normal (tidak perlu aksi tambahan)
        }


        // DEV: login pake user di prisma tanpa cek YSBO
        else {
            user = await prisma.user.findFirst({
                where: {
                    username,
                    deleted_at: null,
                },
                include: {
                    userRole: {
                        include: {
                            role: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
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
                    siswa: {
                        select: {
                            id: true,
                            nisn: true,
                            nipd: true,
                            nama: true,
                        },
                    },
                },
            });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Username atau password salah",
                });
            }

            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Username atau password salah",
                });
            }
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
                siswa_id: user.siswa_id,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "24h",
            }
        );

        const { password: _, ...userData } = user;

        return res.status(200).json({
            success: true,
            message: "Login berhasil",
            data: {
                user: {
                    ...userData,
                    roles,
                },
                accessToken,
                ysboToken: ysboUser?.token,
                login_source: ysboSuccess ? "YSBO" : "LOCAL",
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
        const { pokjaUser, ...userData } = user;

        return res.status(200).json({
            success: true,
            data: { ...userData, roles, is_pokja: Boolean(pokjaUser) },
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
    loginSiswa,
    login,
    logout,
    me,
    invalidateRoleCache,
};
