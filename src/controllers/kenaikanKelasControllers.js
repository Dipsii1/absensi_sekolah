const prisma = require("../config/prisma");

const KEPUTUSAN_VALID = ["Naik", "Tinggal", "Lulus"];

// Helper: hitung batas waktu 1 bulan sebelum akhir tahun ajaran (kenaikan kelas)
const calculateBatasWaktu = (tahun) => {
    const tanggalSelesai = new Date(tahun.tanggal_selesai);
    const batasAwalAksi = new Date(tanggalSelesai);
    batasAwalAksi.setMonth(batasAwalAksi.getMonth() - 1);
    const now = new Date();
    const canAction = now >= batasAwalAksi;
    const diffMs = batasAwalAksi.getTime() - now.getTime();
    const sisaHari = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
        tanggal_mulai: tahun.tanggal_mulai,
        tanggal_selesai: tahun.tanggal_selesai,
        batas_awal_aksi: batasAwalAksi,
        can_action: canAction,
        is_locked: !canAction,
        sisa_hari: sisaHari > 0 ? sisaHari : 0
    };
};

// Preview kenaikan kelas per kelas, per siswa, untuk tahun ajaran tertentu
const getPreviewKenaikan = async (req, res) => {
    try {
        const { tahun_ajaran_id, kelas_id, simulate_unlocked } = req.query;

        const tahun = tahun_ajaran_id
            ? await prisma.tahun.findFirst({ where: { id: parseInt(tahun_ajaran_id), deleted_at: null } })
            : await prisma.tahun.findFirst({ where: { is_active: true, deleted_at: null } });

        if (!tahun) {
            return res.status(404).json({
                success: false,
                message: "Tahun ajaran tidak ditemukan"
            });
        }

        const timing = calculateBatasWaktu(tahun);
        if (simulate_unlocked === "true") {
            timing.can_action = true;
            timing.is_locked = false;
        }

        const userRoles = (req.user?.role_names || (req.user?.role_name ? [req.user.role_name] : [])).map(r => String(r).toUpperCase());
        const isWalasOnly = userRoles.includes("WALAS") && !userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN") && !userRoles.includes("SUPERADMIN");

        const whereKelas = { tahun_ajaran_id: tahun.id, deleted_at: null };

        if (isWalasOnly) {
            if (!req.user.guru_id) {
                return res.status(403).json({
                    success: false,
                    message: "Akun Walas Anda belum terhubung dengan data guru di sistem."
                });
            }
            whereKelas.walas_id = req.user.guru_id;
        }

        if (kelas_id) {
            whereKelas.id = parseInt(kelas_id);
        }

        const kelasList = await prisma.kelas.findMany({
            where: whereKelas,
            include: {
                walas: {
                    select: { id: true, nama: true, NIP: true }
                },
                siswa: {
                    where: { deleted_at: null },
                    select: {
                        id: true,
                        nama: true,
                        nisn: true,
                        nipd: true,
                        jenis_kelamin: true,
                        status_siswa: true
                    },
                    orderBy: { nama: "asc" }
                }
            },
            orderBy: [{ kelas: "asc" }, { jurusan: "asc" }]
        });

        const siswaIds = kelasList.flatMap((k) => k.siswa.map((s) => s.id));

        const existingKeputusan = siswaIds.length
            ? await prisma.kenaikanKelas.findMany({
                  where: { siswa_id: { in: siswaIds }, tahun_ajaran_id: tahun.id }
              })
            : [];
        const keputusanMap = new Map(existingKeputusan.map((k) => [k.siswa_id, k]));

        const data = kelasList.map((kelas) => {
            const isTingkatAkhir = kelas.kelas.toUpperCase() === "XII";
            const defaultKeputusan = isTingkatAkhir ? "Lulus" : "Naik";

            let countNaik = 0;
            let countTinggal = 0;
            let countLulus = 0;
            let countReviewed = 0;

            const siswaList = kelas.siswa.map((s) => {
                const existing = keputusanMap.get(s.id);
                const currentKeputusan = existing?.keputusan || defaultKeputusan;

                if (currentKeputusan === "Naik") countNaik++;
                else if (currentKeputusan === "Tinggal") countTinggal++;
                else if (currentKeputusan === "Lulus") countLulus++;

                if (existing) countReviewed++;

                return {
                    siswa_id: s.id,
                    nama: s.nama,
                    nisn: s.nisn,
                    nipd: s.nipd,
                    jenis_kelamin: s.jenis_kelamin,
                    status_siswa: s.status_siswa,
                    keputusan: currentKeputusan,
                    catatan: existing?.catatan || "",
                    sudah_direview: !!existing,
                    updated_at: existing?.updated_at || null
                };
            });

            return {
                kelas_id: kelas.id,
                kelas: kelas.kelas,
                jurusan: kelas.jurusan,
                walas: kelas.walas,
                is_tingkat_akhir: isTingkatAkhir,
                default_keputusan: defaultKeputusan,
                total_siswa: siswaList.length,
                total_naik: countNaik,
                total_tinggal: countTinggal,
                total_lulus: countLulus,
                total_direview: countReviewed,
                siswa: siswaList
            };
        });

        return res.json({
            success: true,
            data: {
                tahun_ajaran_id: tahun.id,
                tahun_ajaran: tahun.tahun_ajaran,
                ...timing,
                kelas: data
            }
        });
    } catch (error) {
        console.error("Error getPreviewKenaikan:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// Submit keputusan kenaikan kelas per siswa untuk tahun ajaran tertentu
const submitKeputusanKenaikan = async (req, res) => {
    try {
        const { tahun_ajaran_id, keputusan, simulate_unlocked } = req.body;
        const isSimulation = simulate_unlocked === true || req.query.simulate_unlocked === "true";

        if (!tahun_ajaran_id || !Array.isArray(keputusan) || keputusan.length === 0) {
            return res.status(400).json({
                success: false,
                message: "tahun_ajaran_id dan array keputusan wajib diisi"
            });
        }

        const tahun = await prisma.tahun.findFirst({
            where: { id: parseInt(tahun_ajaran_id), deleted_at: null }
        });
        if (!tahun) {
            return res.status(404).json({
                success: false,
                message: "Tahun ajaran tidak ditemukan"
            });
        }

        // VALIDASI ATURAN WAKTU: Halaman tidak bisa menerima action sebelum -1 bulan untuk kenaikan kelas
        const timing = calculateBatasWaktu(tahun);
        if (timing.is_locked && !isSimulation) {
            const formattedBatas = new Date(timing.batas_awal_aksi).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric"
            });
            return res.status(403).json({
                success: false,
                message: `Aksi belum dibuka. Pengisian keputusan dapat dilakukan mulai ${formattedBatas} (H-1 bulan).`,
                is_locked: true,
                batas_awal_aksi: timing.batas_awal_aksi,
                sisa_hari: timing.sisa_hari
            });
        }

        const userRoles = (req.user?.role_names || (req.user?.role_name ? [req.user.role_name] : [])).map(r => String(r).toUpperCase());
        const isWalasOnly = userRoles.includes("WALAS") && !userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN") && !userRoles.includes("SUPERADMIN");

        const errors = [];
        const validRows = [];

        keputusan.forEach((row, i) => {
            const rowNum = i + 1;
            if (!row.siswa_id) {
                errors.push(`Baris ${rowNum}: siswa_id wajib diisi`);
                return;
            }
            if (!row.kelas_id) {
                errors.push(`Baris ${rowNum}: kelas_id wajib diisi`);
                return;
            }
            if (!KEPUTUSAN_VALID.includes(row.keputusan)) {
                errors.push(`Baris ${rowNum}: keputusan harus salah satu dari ${KEPUTUSAN_VALID.join(", ")}`);
                return;
            }
            validRows.push(row);
        });

        if (errors.length > 0) {
            return res.status(422).json({
                success: false,
                message: "Sebagian format data tidak valid, tidak ada perubahan yang disimpan",
                errors
            });
        }

        // Validasi: kelas_id harus milik tahun_ajaran ini, dan jika Walas, harus kelas yang diampu oleh Walas
        const uniqueKelasIds = [...new Set(validRows.map((r) => parseInt(r.kelas_id)))];

        const whereKelasQuery = {
            id: { in: uniqueKelasIds },
            tahun_ajaran_id: tahun.id,
            deleted_at: null,
        };

        if (isWalasOnly) {
            if (!req.user.guru_id) {
                return res.status(403).json({
                    success: false,
                    message: "Akun Walas Anda tidak terhubung dengan data guru"
                });
            }
            whereKelasQuery.walas_id = req.user.guru_id;
        }

        const kelasWithSiswa = await prisma.kelas.findMany({
            where: whereKelasQuery,
            include: {
                siswa: {
                    where: { deleted_at: null },
                    select: { id: true, nama: true },
                },
            },
        });

        const kelasMap = new Map(kelasWithSiswa.map((k) => [k.id, k]));

        for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            const rowNum = i + 1;
            const kelasId = parseInt(row.kelas_id);
            const kelas = kelasMap.get(kelasId);

            if (!kelas) {
                errors.push(
                    isWalasOnly
                        ? `Baris ${rowNum}: Anda bukan wali kelas dari kelas_id ${kelasId} pada tahun ajaran ini`
                        : `Baris ${rowNum}: kelas_id ${kelasId} tidak ditemukan di tahun ajaran ini`
                );
                continue;
            }

            const siswaInKelas = kelas.siswa.some((s) => s.id === row.siswa_id);
            if (!siswaInKelas) {
                errors.push(`Baris ${rowNum}: siswa ${row.siswa_id} tidak terdaftar di kelas ${kelas.kelas}`);
            }
        }

        if (errors.length > 0) {
            return res.status(422).json({
                success: false,
                message: "Validasi kepemilikan kelas / siswa gagal, tidak ada yang disimpan",
                errors
            });
        }

        await prisma.$transaction(
            validRows.map((row) =>
                prisma.kenaikanKelas.upsert({
                    where: {
                        siswa_id_tahun_ajaran_id: {
                            siswa_id: row.siswa_id,
                            tahun_ajaran_id: tahun.id
                        }
                    },
                    update: {
                        keputusan: row.keputusan,
                        catatan: row.catatan || null,
                        kelas_asal_id: parseInt(row.kelas_id),
                        updated_at: new Date()
                    },
                    create: {
                        siswa_id: row.siswa_id,
                        tahun_ajaran_id: tahun.id,
                        kelas_asal_id: parseInt(row.kelas_id),
                        keputusan: row.keputusan,
                        catatan: row.catatan || null
                    }
                })
            )
        );

        return res.status(200).json({
            success: true,
            message: `Berhasil menyimpan keputusan kenaikan kelas untuk ${validRows.length} siswa.`
        });
    } catch (error) {
        console.error("Error submitKeputusanKenaikan:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

module.exports = {
    getPreviewKenaikan,
    submitKeputusanKenaikan
};