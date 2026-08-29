const prisma = require("../config/prisma");
const { formatDateTime, formatTime, formatJam, validateTimeFormat, validateHari } = require("../helper/indexUtils");
const XLSX = require("xlsx");

const createTimeDate = (time) => {
    const [hour, minute] = time.split(":").map(Number);
    return new Date(1970, 0, 1, hour, minute, 0, 0);
};

// get all jadwal
const getAllJadwal = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
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
        const { hari, kelas_id, mapel_id, guru_id, jam_mulai, jam_selesai } = req.body;

        if (!hari || !kelas_id || !mapel_id || !guru_id || !jam_mulai || !jam_selesai) {
            return res.status(400).json({
                success: false,
                message: "Semua field wajib diisi"
            });
        }

        const hariNormalized = hari.trim().charAt(0).toUpperCase() + hari.trim().slice(1).toLowerCase();

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

        const jamMulaiDate = createTimeDate(jam_mulai);
        const jamSelesaiDate = createTimeDate(jam_selesai);

        const [jamMulaiHour, jamMulaiMinute] = jam_mulai.split(':').map(Number);
        const [jamSelesaiHour, jamSelesaiMinute] = jam_selesai.split(':').map(Number);
        const totalMulai = jamMulaiHour * 60 + jamMulaiMinute;
        const totalSelesai = jamSelesaiHour * 60 + jamSelesaiMinute;

        if (totalSelesai <= totalMulai) {
            return res.status(400).json({
                success: false,
                message: "Jam selesai harus setelah jam mulai"
            });
        }

        const overlapCondition = {
            jam_mulai: { lt: jamSelesaiDate },
            jam_selesai: { gt: jamMulaiDate }
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
                jam_mulai: jamMulaiDate,
                jam_selesai: jamSelesaiDate
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
        const { hari, kelas_id, mapel_id, guru_id, jam_mulai, jam_selesai } = req.body;
        const jadwalId = parseInt(id);

        if (!hari || !kelas_id || !mapel_id || !guru_id || !jam_mulai || !jam_selesai) {
            return res.status(400).json({
                success: false,
                message: "Semua field harus terisi"
            });
        }

        const hariNormalized = hari.trim().charAt(0).toUpperCase() + hari.trim().slice(1).toLowerCase();

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

        const jamMulaiDate = createTimeDate(jam_mulai);
        const jamSelesaiDate = createTimeDate(jam_selesai);

        const [jamMulaiHour, jamMulaiMinute] = jam_mulai.split(':').map(Number);
        const [jamSelesaiHour, jamSelesaiMinute] = jam_selesai.split(':').map(Number);
        const totalMulai = jamMulaiHour * 60 + jamMulaiMinute;
        const totalSelesai = jamSelesaiHour * 60 + jamSelesaiMinute;

        if (totalSelesai <= totalMulai) {
            return res.status(400).json({
                success: false,
                message: "Jam selesai harus setelah jam mulai"
            });
        }

        const overlapCondition = {
            jam_mulai: { lt: jamSelesaiDate },
            jam_selesai: { gt: jamMulaiDate }
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
                jam_mulai: jamMulaiDate,
                jam_selesai: jamSelesaiDate,
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
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        const headerRowIdx = rawRows.findIndex(row => row.includes("HARI"));

        if (headerRowIdx === -1) {
            return res.status(400).json({
                success: false,
                message: "Header kolom tidak ditemukan. Pastikan terdapat kolom bernama 'HARI'",
            });
        }

        const headers = rawRows[headerRowIdx];
        const rows = rawRows
            .slice(headerRowIdx + 1)
            .filter(row => row.some(v => v !== ""))
            .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])));

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: "File kosong atau tidak ada data" });
        }

        const VALID_HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const REQUIRED_COLUMNS = ["HARI", "KELAS", "JURUSAN", "NAMA_MAPEL", "NAMA_GURU", "JAM_MULAI", "JAM_SELESAI"];

        const missingCols = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
        if (missingCols.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Kolom tidak lengkap: ${missingCols.join(", ")}`,
            });
        }

        let created = 0;
        let skipped = 0;
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            const idRaw = row["ID"] !== undefined ? String(row["ID"]).trim() : "";
            const id = idRaw !== "" && !isNaN(parseInt(idRaw)) ? parseInt(idRaw) : null;

            const hariRaw = String(row["HARI"] || "").trim();
            const hari = hariRaw.charAt(0).toUpperCase() + hariRaw.slice(1).toLowerCase();

            const kelasStr = String(row["KELAS"] || "").trim();
            const jurusan = String(row["JURUSAN"] || "").trim();
            const namaMapel = String(row["NAMA_MAPEL"] || "").trim();
            const namaGuru = String(row["NAMA_GURU"] || "").trim();
            const jamMulai = String(row["JAM_MULAI"] || "").trim();
            const jamSelesai = String(row["JAM_SELESAI"] || "").trim();

            if (!hari && !kelasStr && !namaMapel && !namaGuru) continue;

            if (id !== null) {
                const existing = await prisma.jadwal.findUnique({ where: { id } });
                if (!existing) {
                    errors.push({ row: rowNum, pesan: `Jadwal dengan ID "${id}" tidak ditemukan di sistem` });
                    skipped++;
                    continue;
                }
            }

            if (!VALID_HARI.includes(hari)) {
                errors.push({ row: rowNum, pesan: `Hari tidak valid: "${hari}"` });
                skipped++;
                continue;
            }

            if (!kelasStr || !jurusan) {
                errors.push({ row: rowNum, pesan: "KELAS dan JURUSAN wajib diisi" });
                skipped++;
                continue;
            }

            if (!namaMapel) {
                errors.push({ row: rowNum, pesan: "NAMA_MAPEL wajib diisi" });
                skipped++;
                continue;
            }

            if (!namaGuru) {
                errors.push({ row: rowNum, pesan: "NAMA_GURU wajib diisi" });
                skipped++;
                continue;
            }

            const timeRegex = /^\d{2}:\d{2}$/;
            if (!timeRegex.test(jamMulai) || !timeRegex.test(jamSelesai)) {
                errors.push({ row: rowNum, pesan: `Format jam tidak valid — gunakan HH:MM (mulai: "${jamMulai}", selesai: "${jamSelesai}")` });
                skipped++;
                continue;
            }

            const [mH, mM] = jamMulai.split(":").map(Number);
            const [sH, sM] = jamSelesai.split(":").map(Number);
            if (sH * 60 + sM <= mH * 60 + mM) {
                errors.push({ row: rowNum, pesan: `Jam selesai (${jamSelesai}) harus setelah jam mulai (${jamMulai})` });
                skipped++;
                continue;
            }

            const kelasRecord = await prisma.kelas.findFirst({
                where: { kelas: kelasStr, jurusan: { equals: jurusan, mode: "insensitive" }, deleted_at: null }
            });
            if (!kelasRecord) {
                errors.push({ row: rowNum, pesan: `Kelas "${kelasStr} ${jurusan}" tidak ditemukan di sistem` });
                skipped++;
                continue;
            }

            const mapelRecord = await prisma.mataPelajaran.findFirst({
                where: { nama_mapel: { equals: namaMapel, mode: "insensitive" }, deleted_at: null }
            });
            if (!mapelRecord) {
                errors.push({ row: rowNum, pesan: `Mata pelajaran "${namaMapel}" tidak ditemukan di sistem` });
                skipped++;
                continue;
            }

            const guruRecord = await prisma.guru.findFirst({
                where: { nama: { equals: namaGuru, mode: "insensitive" }, deleted_at: null }
            });
            if (!guruRecord) {
                errors.push({ row: rowNum, pesan: `Guru "${namaGuru}" tidak ditemukan di sistem` });
                skipped++;
                continue;
            }

            const jamMulaiDate = createTimeDate(jamMulai);
            const jamSelesaiDate = createTimeDate(jamSelesai);

            const overlapCondition = {
                jam_mulai: { lt: jamSelesaiDate },
                jam_selesai: { gt: jamMulaiDate }
            };

            const conflictWhereClause = {
                hari,
                ...overlapCondition,
                ...(id !== null && { id: { not: id } })
            };

            const conflictKelas = await prisma.jadwal.findFirst({
                where: {
                    kelas_id: kelasRecord.id,
                    ...conflictWhereClause
                }
            });
            if (conflictKelas) {
                errors.push({ row: rowNum, pesan: `Jadwal bentrok dengan jadwal kelas ${kelasStr} ${jurusan} pada hari ${hari} jam ${jamMulai}–${jamSelesai}` });
                skipped++;
                continue;
            }

            const conflictGuru = await prisma.jadwal.findFirst({
                where: {
                    guru_id: guruRecord.id,
                    ...conflictWhereClause
                }
            });
            if (conflictGuru) {
                errors.push({ row: rowNum, pesan: `Guru "${namaGuru}" sudah memiliki jadwal pada hari ${hari} jam ${jamMulai}–${jamSelesai}` });
                skipped++;
                continue;
            }

            try {
                if (id !== null) {
                    await prisma.jadwal.update({
                        where: { id },
                        data: {
                            hari,
                            kelas_id: kelasRecord.id,
                            mapel_id: mapelRecord.id,
                            guru_id: guruRecord.id,
                            jam_mulai: jamMulaiDate,
                            jam_selesai: jamSelesaiDate,
                            updated_at: new Date()
                        }
                    });
                } else {
                    await prisma.jadwal.create({
                        data: {
                            hari,
                            kelas_id: kelasRecord.id,
                            mapel_id: mapelRecord.id,
                            guru_id: guruRecord.id,
                            jam_mulai: jamMulaiDate,
                            jam_selesai: jamSelesaiDate
                        }
                    });
                }
                created++;
            } catch (err) {
                if (err.code === 'P2002') {
                    errors.push({ row: rowNum, pesan: `Kombinasi kelas, hari, jam mulai sudah ada di sistem` });
                } else {
                    errors.push({ row: rowNum, pesan: `Gagal memproses baris: ${err.message}` });
                }
                skipped++;
            }
        }

        return res.status(200).json({
            success: true,
            message: `Import selesai: ${created} jadwal diproses (tambah/update), ${skipped} dilewati`,
            data: { created, skipped, errors }
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