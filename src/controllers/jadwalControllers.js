const prisma = require("../config/prisma");
const { formatDateTime, formatTime, formatJam, validateTimeFormat, validateHari } = require("../helper/indexUtils");
const XLSX = require("xlsx");


const normalizeJamValue = (raw) => {
    if (raw === null || raw === undefined || raw === "") return "";

    // Date object (hanya kalau reader memakai cellDates: true)
    if (raw instanceof Date && !isNaN(raw.getTime())) {
        const hh = String(raw.getHours()).padStart(2, "0");
        const mm = String(raw.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
    }

    // Angka serial Excel (waktu = pecahan hari, mis. 07:00 -> 0.291666...)
    if (typeof raw === "number") {
        if (!Number.isFinite(raw) || raw < 0) return String(raw);
        const fractionOfDay = raw % 1;
        const totalMinutes = Math.round(fractionOfDay * 24 * 60) % (24 * 60);
        const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
        const mm = String(totalMinutes % 60).padStart(2, "0");
        return `${hh}:${mm}`;
    }

    // String: "07:00", "7.00", "07:00:00"
    const str = String(raw).trim().replace(/\./g, ":");
    const match = str.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
    if (match) {
        const hh = match[1].padStart(2, "0");
        const mm = match[2].padStart(2, "0");
        return `${hh}:${mm}`;
    }

    return str;
};

// get all jadwal
const getAllJadwal = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const whereCondition = {};

        if (req.query.kelas_id) {
            whereCondition.kelas_id = parseInt(req.query.kelas_id);
        }

        if (req.query.guru_id) {
            whereCondition.guru_id = parseInt(req.query.guru_id);
        }

        if (req.query.hari) {
            const h = req.query.hari.trim();
            whereCondition.hari = h.charAt(0).toUpperCase() + h.slice(1).toLowerCase();
        }

        const [data, total] = await Promise.all([
            prisma.jadwal.findMany({
                where: whereCondition,
                skip,
                take: limit,
                orderBy: [
                    { hari: "asc" },
                    { jam_mulai: "asc" }
                ],
                include: {
                    kelas: {
                        select: {
                            id: true,
                            kelas: true,
                            jurusan: true,
                            tahun: {
                                select: {
                                    tahun_ajaran: true
                                }
                            }
                        }
                    },
                    mata_pelajaran: {
                        select: {
                            id: true,
                            nama_mapel: true
                        }
                    },
                    guru: {
                        select: {
                            id: true,
                            NIP: true,
                            nama: true
                        }
                    }
                }
            }),
            prisma.jadwal.count({ where: whereCondition })
        ]);

        const formattedData = data.map(jadwal => ({
            id: jadwal.id,
            hari: jadwal.hari,
            jam_mulai: formatJam(jadwal.jam_mulai),
            jam_selesai: formatJam(jadwal.jam_selesai),
            jam_lengkap: `${formatJam(jadwal.jam_mulai)} - ${formatJam(jadwal.jam_selesai)}`,
            kelas: jadwal.kelas,
            mata_pelajaran: jadwal.mata_pelajaran,
            guru: jadwal.guru,
            created_at: formatDateTime(jadwal.created_at),
            updated_at: formatDateTime(jadwal.updated_at)
        }));

        return res.json({
            success: true,
            message: "Berhasil mendapatkan data jadwal",
            data: formattedData,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error in getAllJadwal:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// create jadwal
const createJadwal = async (req, res) => {
    try {
        let { hari, kelas_id, mapel_id, guru_id, jam_mulai, jam_selesai } = req.body;

        if (!hari || !kelas_id || !mapel_id || !guru_id || !jam_mulai || !jam_selesai) {
            return res.status(400).json({
                success: false,
                message: "Semua field wajib diisi"
            });
        }

        hari = typeof hari === 'string' ? hari.trim() : hari;
        jam_mulai = normalizeJamValue(jam_mulai);
        jam_selesai = normalizeJamValue(jam_selesai);

        const hariNormalized = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();

        if (!validateHari(hariNormalized)) {
            return res.status(400).json({
                success: false,
                message: "Hari tidak valid (gunakan: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu)"
            });
        }

        if (isNaN(parseInt(kelas_id)) || isNaN(parseInt(mapel_id)) || isNaN(parseInt(guru_id))) {
            return res.status(400).json({
                success: false,
                message: "Kelas ID, Mapel ID, dan Guru ID harus berupa angka"
            });
        }

        if (!validateTimeFormat(jam_mulai) || !validateTimeFormat(jam_selesai)) {
            return res.status(400).json({
                success: false,
                message: "Format jam tidak valid (gunakan HH:MM)"
            });
        }

        const kelasExists = await prisma.kelas.findFirst({
            where: { id: parseInt(kelas_id), deleted_at: null }
        });
        if (!kelasExists) {
            return res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        }

        const mapelExists = await prisma.mataPelajaran.findFirst({
            where: { id: parseInt(mapel_id), deleted_at: null }
        });
        if (!mapelExists) {
            return res.status(404).json({ success: false, message: "Mata pelajaran tidak ditemukan" });
        }

        const guruExists = await prisma.guru.findFirst({
            where: { id: parseInt(guru_id), deleted_at: null }
        });
        if (!guruExists) {
            return res.status(404).json({ success: false, message: "Guru tidak ditemukan" });
        }

        const [jamMulaiHour, jamMulaiMinute] = jam_mulai.split(':').map(Number);
        const [jamSelesaiHour, jamSelesaiMinute] = jam_selesai.split(':').map(Number);
        if (jamSelesaiHour * 60 + jamSelesaiMinute <= jamMulaiHour * 60 + jamMulaiMinute) {
            return res.status(400).json({
                success: false,
                message: "Jam selesai harus setelah jam mulai"
            });
        }

        const overlapCondition = {
            jam_mulai: { lt: jam_selesai },
            jam_selesai: { gt: jam_mulai }
        };

        const conflictKelas = await prisma.jadwal.findFirst({
            where: {
                kelas_id: parseInt(kelas_id),
                hari: hariNormalized,
                ...overlapCondition
            }
        });
        if (conflictKelas) {
            return res.status(409).json({
                success: false,
                message: "Jadwal bentrok dengan jadwal kelas lain pada waktu yang sama",
                conflict: {
                    id: conflictKelas.id,
                    hari: conflictKelas.hari,
                    jam_mulai_raw: conflictKelas.jam_mulai,
                    jam_selesai_raw: conflictKelas.jam_selesai
                }
            });
        }

        const conflictGuru = await prisma.jadwal.findFirst({
            where: {
                guru_id: parseInt(guru_id),
                hari: hariNormalized,
                ...overlapCondition
            }
        });
        if (conflictGuru) {
            return res.status(409).json({
                success: false,
                message: "Guru sudah memiliki jadwal mengajar pada waktu yang sama"
            });
        }

        const newJadwal = await prisma.jadwal.create({
            data: {
                hari: hariNormalized,
                kelas_id: parseInt(kelas_id),
                mapel_id: parseInt(mapel_id),
                guru_id: parseInt(guru_id),
                jam_mulai,
                jam_selesai
            },
            include: {
                kelas: { select: { kelas: true, jurusan: true } },
                mata_pelajaran: { select: { nama_mapel: true } },
                guru: { select: { nama: true } }
            }
        });

        return res.status(201).json({
            success: true,
            message: "Berhasil menambahkan jadwal baru",
            data: {
                id: newJadwal.id,
                hari: newJadwal.hari,
                jam_mulai: formatJam(newJadwal.jam_mulai),
                jam_selesai: formatJam(newJadwal.jam_selesai),
                jam_lengkap: `${formatJam(newJadwal.jam_mulai)} - ${formatJam(newJadwal.jam_selesai)}`,
                kelas: newJadwal.kelas,
                mata_pelajaran: newJadwal.mata_pelajaran,
                guru: newJadwal.guru,
                created_at: formatDateTime(newJadwal.created_at)
            }
        });

    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                message: "Jadwal dengan kombinasi kelas, hari, dan jam mulai ini sudah ada"
            });
        }
        console.error("Error creating jadwal:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// update jadwal
const updateJadwal = async (req, res) => {
    try {
        const { id } = req.params;
        let { hari, kelas_id, mapel_id, guru_id, jam_mulai, jam_selesai } = req.body;
        const jadwalId = parseInt(id);

        if (!hari || !kelas_id || !mapel_id || !guru_id || !jam_mulai || !jam_selesai) {
            return res.status(400).json({
                success: false,
                message: "Semua field harus terisi"
            });
        }

        hari = typeof hari === 'string' ? hari.trim() : hari;
        jam_mulai = normalizeJamValue(jam_mulai);
        jam_selesai = normalizeJamValue(jam_selesai);

        const hariNormalized = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();

        if (!validateHari(hariNormalized)) {
            return res.status(400).json({
                success: false,
                message: "Hari tidak valid (gunakan: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu)"
            });
        }

        if (!validateTimeFormat(jam_mulai) || !validateTimeFormat(jam_selesai)) {
            return res.status(400).json({
                success: false,
                message: "Format jam tidak valid (gunakan HH:MM)"
            });
        }

        const existingJadwal = await prisma.jadwal.findUnique({
            where: { id: jadwalId }
        });
        if (!existingJadwal) {
            return res.status(404).json({ success: false, message: "Jadwal tidak ditemukan" });
        }

        const [kelasExists, mapelExists, guruExists] = await Promise.all([
            prisma.kelas.findFirst({ where: { id: parseInt(kelas_id), deleted_at: null } }),
            prisma.mataPelajaran.findFirst({ where: { id: parseInt(mapel_id), deleted_at: null } }),
            prisma.guru.findFirst({ where: { id: parseInt(guru_id), deleted_at: null } })
        ]);

        if (!kelasExists) {
            return res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        }
        if (!mapelExists) {
            return res.status(404).json({ success: false, message: "Mata pelajaran tidak ditemukan" });
        }
        if (!guruExists) {
            return res.status(404).json({ success: false, message: "Guru tidak ditemukan" });
        }

        const [jamMulaiHour, jamMulaiMinute] = jam_mulai.split(':').map(Number);
        const [jamSelesaiHour, jamSelesaiMinute] = jam_selesai.split(':').map(Number);
        if (jamSelesaiHour * 60 + jamSelesaiMinute <= jamMulaiHour * 60 + jamMulaiMinute) {
            return res.status(400).json({
                success: false,
                message: "Jam selesai harus setelah jam mulai"
            });
        }

        const overlapCondition = {
            jam_mulai: { lt: jam_selesai },
            jam_selesai: { gt: jam_mulai }
        };

        const conflictKelas = await prisma.jadwal.findFirst({
            where: {
                id: { not: jadwalId },
                kelas_id: parseInt(kelas_id),
                hari: hariNormalized,
                ...overlapCondition
            }
        });

        const conflictGuru = await prisma.jadwal.findFirst({
            where: {
                id: { not: jadwalId },
                guru_id: parseInt(guru_id),
                hari: hariNormalized,
                ...overlapCondition
            }
        });

        if (conflictKelas) {
            return res.status(409).json({ success: false, message: "Jadwal bentrok dengan jadwal kelas lain" });
        }
        if (conflictGuru) {
            return res.status(409).json({ success: false, message: "Guru sudah memiliki jadwal pada waktu yang sama" });
        }

        const updatedJadwal = await prisma.jadwal.update({
            where: { id: jadwalId },
            data: {
                hari: hariNormalized,
                kelas_id: parseInt(kelas_id),
                mapel_id: parseInt(mapel_id),
                guru_id: parseInt(guru_id),
                jam_mulai: jam_mulai,
                jam_selesai: jam_selesai,
                updated_at: new Date()
            },
            include: {
                kelas: { select: { kelas: true, jurusan: true } },
                mata_pelajaran: { select: { nama_mapel: true } },
                guru: { select: { nama: true } }
            }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mengupdate jadwal",
            data: {
                id: updatedJadwal.id,
                hari: updatedJadwal.hari,
                jam_mulai: formatJam(updatedJadwal.jam_mulai),
                jam_selesai: formatJam(updatedJadwal.jam_selesai),
                jam_lengkap: `${formatJam(updatedJadwal.jam_mulai)} - ${formatJam(updatedJadwal.jam_selesai)}`,
                kelas: updatedJadwal.kelas,
                mata_pelajaran: updatedJadwal.mata_pelajaran,
                guru: updatedJadwal.guru,
                updated_at: formatDateTime(updatedJadwal.updated_at)
            }
        });

    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                success: false,
                message: "Jadwal dengan kombinasi kelas, hari, dan jam mulai ini sudah ada"
            });
        }
        console.error("Error updating jadwal:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// delete jadwal (hard delete)
const deleteJadwal = async (req, res) => {
    try {
        const { id } = req.params;

        const existingJadwal = await prisma.jadwal.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existingJadwal) {
            return res.status(404).json({ success: false, message: "Jadwal tidak ditemukan" });
        }

        await prisma.jadwal.delete({
            where: { id: parseInt(id) }
        });

        return res.status(200).json({ success: true, message: "Berhasil menghapus jadwal" });

    } catch (error) {
        console.error("Error deleting jadwal:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// Import Jadwal dari XLSX
const importJadwal = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "File tidak ditemukan" });
        }

        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        const norm = (v) => String(v ?? "").trim().toUpperCase();
        const headerRowIdx = rawRows.findIndex(row => row.some(c => norm(c) === "HARI"));

        if (headerRowIdx === -1) {
            return res.status(400).json({
                success: false,
                message: "Header kolom tidak ditemukan. Pastikan terdapat kolom bernama 'HARI'",
            });
        }

        const headers = rawRows[headerRowIdx].map(norm);

        const VALID_HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const REQUIRED_COLUMNS = ["HARI", "KELAS", "JURUSAN", "KODE_MAPEL", "ID_GURU", "JAM_MULAI", "JAM_SELESAI"];

        const missingCols = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
        if (missingCols.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Kolom tidak lengkap: ${missingCols.join(", ")}`,
            });
        }

        const rows = rawRows
            .slice(headerRowIdx + 1)
            .map((row, idx) => ({ row, rowNum: headerRowIdx + 2 + idx }))
            .filter(({ row }) => row.some(v => String(v).trim() !== ""))
            .map(({ row, rowNum }) => ({
                rowNum,
                data: Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))
            }));

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "File kosong atau tidak ada data" });
        }

        const tahunAktif = await prisma.tahun.findFirst({
            where: { is_active: true, deleted_at: null }
        });
        if (!tahunAktif) {
            return res.status(400).json({
                success: false,
                message: "Tidak ada tahun ajaran aktif. Aktifkan tahun ajaran terlebih dahulu."
            });
        }

        const kelasCache = new Map();
        const mapelCache = new Map();
        const guruCache = new Map();

        const getKelas = async (kelas, jurusan) => {
            const key = `${kelas}|${jurusan.toLowerCase()}`;
            if (!kelasCache.has(key)) {
                kelasCache.set(key, await prisma.kelas.findFirst({
                    where: {
                        kelas,
                        jurusan: { equals: jurusan, mode: "insensitive" },
                        tahun_ajaran_id: tahunAktif.id,
                        status_kelas: "Active",
                        deleted_at: null
                    }
                }));
            }
            return kelasCache.get(key);
        };

        const getMapel = async (kode) => {
            const key = kode.toLowerCase();
            if (!mapelCache.has(key)) {
                mapelCache.set(key, await prisma.mataPelajaran.findFirst({
                    where: { kode_mapel: { equals: kode, mode: "insensitive" }, deleted_at: null }
                }));
            }
            return mapelCache.get(key);
        };

        const getGuru = async (id) => {
            if (!guruCache.has(id)) {
                guruCache.set(id, await prisma.guru.findFirst({ where: { id, deleted_at: null } }));
            }
            return guruCache.get(id);
        };

        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors = [];

        for (const { data: row, rowNum } of rows) {
            const fail = (pesan) => {
                errors.push({ row: rowNum, pesan });
                skipped++;
            };

            try {
                const idRaw = row["ID"] !== undefined ? String(row["ID"]).trim() : "";
                const id = idRaw !== "" && !isNaN(parseInt(idRaw)) ? parseInt(idRaw) : null;

                const hariRaw = String(row["HARI"] || "").trim();
                const hari = hariRaw.charAt(0).toUpperCase() + hariRaw.slice(1).toLowerCase();

                const kelasStr = String(row["KELAS"] || "").trim();
                const jurusan = String(row["JURUSAN"] || "").trim();
                const kodeMapel = String(row["KODE_MAPEL"] || "").trim();
                const idGuruRaw = String(row["ID_GURU"] || "").trim();
                const idGuru = idGuruRaw !== "" && !isNaN(parseInt(idGuruRaw)) ? parseInt(idGuruRaw) : null;
                const jamMulai = normalizeJamValue(row["JAM_MULAI"]);
                const jamSelesai = normalizeJamValue(row["JAM_SELESAI"]);

                if (!hari && !kelasStr && !kodeMapel && !idGuruRaw) continue;

                if (id !== null) {
                    const existing = await prisma.jadwal.findUnique({ where: { id } });
                    if (!existing) {
                        fail(`Jadwal dengan ID "${id}" tidak ditemukan di sistem`);
                        continue;
                    }
                }

                if (!VALID_HARI.includes(hari)) {
                    fail(`Hari tidak valid: "${hari}"`);
                    continue;
                }

                if (!kelasStr || !jurusan) {
                    fail("KELAS dan JURUSAN wajib diisi");
                    continue;
                }

                if (!kodeMapel) {
                    fail("KODE_MAPEL wajib diisi");
                    continue;
                }

                if (idGuru === null) {
                    fail("ID_GURU wajib diisi dan harus berupa angka");
                    continue;
                }

                if (!timeRegex.test(jamMulai) || !timeRegex.test(jamSelesai)) {
                    fail(`Format jam tidak valid — gunakan HH:MM (mulai: "${jamMulai}", selesai: "${jamSelesai}")`);
                    continue;
                }

                const [mH, mM] = jamMulai.split(":").map(Number);
                const [sH, sM] = jamSelesai.split(":").map(Number);
                if (sH * 60 + sM <= mH * 60 + mM) {
                    fail(`Jam selesai (${jamSelesai}) harus setelah jam mulai (${jamMulai})`);
                    continue;
                }

                const kelasRecord = await getKelas(kelasStr, jurusan);
                if (!kelasRecord) {
                    fail(`Kelas "${kelasStr} ${jurusan}" tidak ditemukan pada tahun ajaran aktif (${tahunAktif.tahun_ajaran})`);
                    continue;
                }

                const mapelRecord = await getMapel(kodeMapel);
                if (!mapelRecord) {
                    fail(`Mata pelajaran dengan kode "${kodeMapel}" tidak ditemukan di sistem`);
                    continue;
                }

                const guruRecord = await getGuru(idGuru);
                if (!guruRecord) {
                    fail(`Guru dengan ID "${idGuru}" tidak ditemukan di sistem`);
                    continue;
                }

                const conflictWhereClause = {
                    hari,
                    jam_mulai: { lt: jamSelesai },
                    jam_selesai: { gt: jamMulai },
                    ...(id !== null && { id: { not: id } })
                };

                const conflictKelas = await prisma.jadwal.findFirst({
                    where: { kelas_id: kelasRecord.id, ...conflictWhereClause }
                });
                if (conflictKelas) {
                    fail(`Jadwal bentrok dengan jadwal kelas ${kelasStr} ${jurusan} pada hari ${hari} jam ${jamMulai}–${jamSelesai}`);
                    continue;
                }

                const conflictGuru = await prisma.jadwal.findFirst({
                    where: { guru_id: guruRecord.id, ...conflictWhereClause }
                });
                if (conflictGuru) {
                    fail(`Guru ID ${idGuru} sudah memiliki jadwal pada hari ${hari} jam ${jamMulai}–${jamSelesai}`);
                    continue;
                }

                if (id !== null) {
                    await prisma.jadwal.update({
                        where: { id },
                        data: {
                            hari,
                            kelas_id: kelasRecord.id,
                            mapel_id: mapelRecord.id,
                            guru_id: guruRecord.id,
                            jam_mulai: jamMulai,
                            jam_selesai: jamSelesai,
                            updated_at: new Date()
                        }
                    });
                    updated++;
                } else {
                    await prisma.jadwal.create({
                        data: {
                            hari,
                            kelas_id: kelasRecord.id,
                            mapel_id: mapelRecord.id,
                            guru_id: guruRecord.id,
                            jam_mulai: jamMulai,
                            jam_selesai: jamSelesai
                        }
                    });
                    created++;
                }
            } catch (err) {
                if (err.code === "P2002") {
                    fail("Kombinasi kelas, hari, jam mulai sudah ada di sistem");
                } else {
                    fail(`Gagal memproses baris: ${err.message}`);
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: `Import selesai: ${created} ditambahkan, ${updated} diperbarui, ${skipped} dilewati`,
            data: { created, updated, skipped, errors }
        });

    } catch (error) {
        console.error("Error in importJadwal:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

module.exports = {
    getAllJadwal,
    createJadwal,
    updateJadwal,
    deleteJadwal,
    importJadwal
};