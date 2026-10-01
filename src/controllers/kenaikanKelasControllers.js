const prisma = require("../config/prisma");

const KEPUTUSAN_VALID = ["Naik", "Tinggal", "Lulus"];


// preview kenaikan kelas per kelas, per siswa, untuk tahun ajaran tertentu.
const getPreviewKenaikan = async (req, res) => {
    try {
        const { tahun_ajaran_id, kelas_id } = req.query;

        const tahun = tahun_ajaran_id
            ? await prisma.tahun.findFirst({ where: { id: parseInt(tahun_ajaran_id), deleted_at: null } })
            : await prisma.tahun.findFirst({ where: { is_active: true, deleted_at: null } });

        if (!tahun) {
            return res.status(404).json({
                success: false,
                message: "Tahun ajaran tidak ditemukan"
            });
        }

        const whereKelas = { tahun_ajaran_id: tahun.id, deleted_at: null };
        if (kelas_id) whereKelas.id = parseInt(kelas_id);

        const kelasList = await prisma.kelas.findMany({
            where: whereKelas,
            include: {
                siswa: {
                    where: { deleted_at: null },
                    select: { id: true, nama: true, nisn: true }
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
            const defaultKeputusan = kelas.kelas.toUpperCase() === "XII" ? "Lulus" : "Naik";
            return {
                kelas_id: kelas.id,
                kelas: kelas.kelas,
                jurusan: kelas.jurusan,
                default_keputusan: defaultKeputusan,
                siswa: kelas.siswa.map((s) => {
                    const existing = keputusanMap.get(s.id);
                    return {
                        siswa_id: s.id,
                        nama: s.nama,
                        nisn: s.nisn,
                        keputusan: existing?.keputusan || defaultKeputusan,
                        catatan: existing?.catatan || null,
                        sudah_direview: !!existing
                    };
                })
            };
        });

        return res.json({
            success: true,
            data: {
                tahun_ajaran_id: tahun.id,
                tahun_ajaran: tahun.tahun_ajaran,
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

// submit keputusan kenaikan kelas per siswa untuk tahun ajaran tertentu.
const submitKeputusanKenaikan = async (req, res) => {
    try {
        const { tahun_ajaran_id, keputusan } = req.body;

        if (!tahun_ajaran_id || !Array.isArray(keputusan) || keputusan.length === 0) {
            return res.status(400).json({
                success: false,
                message: "tahun_ajaran_id dan keputusan (array) wajib diisi"
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
                message: "Sebagian data tidak valid, tidak ada yang disimpan",
                errors
            });
        }

        // Validasi: kelas_id harus milik tahun_ajaran ini, dan siswa harus terdaftar di kelas tersebut
        const uniqueKelasIds = [...new Set(validRows.map((r) => parseInt(r.kelas_id)))];

        const kelasWithSiswa = await prisma.kelas.findMany({
            where: {
                id: { in: uniqueKelasIds },
                tahun_ajaran_id: tahun.id,
                deleted_at: null,
            },
            include: {
                siswa: {
                    where: { deleted_at: null },
                    select: { id: true },
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
                errors.push(`Baris ${rowNum}: kelas_id ${kelasId} tidak ditemukan di tahun ajaran ini`);
                continue;
            }

            const siswaInKelas = kelas.siswa.some((s) => s.id === row.siswa_id);
            if (!siswaInKelas) {
                errors.push(`Baris ${rowNum}: siswa ${row.siswa_id} tidak terdaftar di kelas_id ${kelasId}`);
            }
        }

        if (errors.length > 0) {
            return res.status(422).json({
                success: false,
                message: "Validasi gagal, tidak ada yang disimpan",
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
            message: `Berhasil menyimpan ${validRows.length} keputusan kenaikan kelas`
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