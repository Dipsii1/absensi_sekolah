const prisma = require("../config/prisma");
<<<<<<< HEAD
const { formatDateTime, formatTime, validateTimeFormat, validateHari } = require("../helper/date");
const XLSX = require("xlsx");
=======
const { formatDateTime, formatTime, validateTimeFormat, validateHari  } = require("../helper/date");
const multer = require("multer");
const ExcelJS = require("exceljs");

// ─── Multer – simpan di memory, hanya terima .xlsx ───────────────────────────
const storage = multer.memoryStorage();
const xlsxFilter = (req, file, cb) => {
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.originalname.toLowerCase().endsWith(".xlsx")) {
        cb(null, true);
    } else {
        cb(new Error("Hanya file .xlsx yang diterima"), false);
    }
};
const uploadXlsx = multer({ storage, fileFilter: xlsxFilter, limits: { fileSize: 5 * 1024 * 1024 } });
>>>>>>> 31d4e498c74e48450846e93144e44e1a243d466a



// get all jadwal
const getAllJadwal = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const whereCondition = {
            deleted_at: null
        };

        // Filter by kelas_id if provided
        if (req.query.kelas_id) {
            whereCondition.kelas_id = parseInt(req.query.kelas_id);
        }

        // Filter by guru_id if provided
        if (req.query.guru_id) {
            whereCondition.guru_id = parseInt(req.query.guru_id);
        }

        // Filter by hari if provided
        if (req.query.hari) {
            whereCondition.hari = req.query.hari.toUpperCase();
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
            prisma.jadwal.count({
                where: whereCondition
            })
        ]);


        // format response
        const formattedData = data.map(jadwal => ({
            id: jadwal.id,
            hari: jadwal.hari,
            jam_mulai: formatTime(jadwal.jam_mulai),
            jam_selesai: formatTime(jadwal.jam_selesai),
            jam_lengkap: `${formatTime(jadwal.jam_mulai)} - ${formatTime(jadwal.jam_selesai)}`,
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
        const {
            hari,
            kelas_id,
            mapel_id,
            guru_id,
            jam_mulai,
            jam_selesai
        } = req.body;

        // Validasi input wajib
        if (!hari || !kelas_id || !mapel_id || !guru_id || !jam_mulai || !jam_selesai) {
            return res.status(400).json({
                success: false,
                message: "Semua field wajib diisi"
            });
        }

        // Validasi hari
        if (!validateHari(hari)) {
            return res.status(400).json({
                success: false,
                message: "Hari tidak valid (gunakan: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU)"
            });
        }

        // Validasi ID harus angka
        if (isNaN(parseInt(kelas_id)) || isNaN(parseInt(mapel_id)) || isNaN(parseInt(guru_id))) {
            return res.status(400).json({
                success: false,
                message: "Kelas ID, Mapel ID, dan Guru ID harus berupa angka"
            });
        }

        // Validasi format waktu
        if (!validateTimeFormat(jam_mulai) || !validateTimeFormat(jam_selesai)) {
            return res.status(400).json({
                success: false,
                message: "Format jam tidak valid (gunakan HH:MM)"
            });
        }

        // Validasi kelas exists
        const kelasExists = await prisma.kelas.findFirst({
            where: {
                id: parseInt(kelas_id),
                deleted_at: null
            }
        });

        if (!kelasExists) {
            return res.status(404).json({
                success: false,
                message: "Kelas tidak ditemukan"
            });
        }

        // Validasi mata pelajaran exists
        const mapelExists = await prisma.mataPelajaran.findFirst({
            where: {
                id: parseInt(mapel_id),
                deleted_at: null
            }
        });

        if (!mapelExists) {
            return res.status(404).json({
                success: false,
                message: "Mata pelajaran tidak ditemukan"
            });
        }

        // Validasi guru exists
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

        // Konversi jam ke format Time untuk PostgreSQL
        const jamMulaiTime = `${jam_mulai}:00`;
        const jamSelesaiTime = `${jam_selesai}:00`;

        // Validasi jam selesai harus setelah jam mulai
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

        // Cek konflik jadwal kelas
        const conflictKelas = await prisma.jadwal.findFirst({
            where: {
                kelas_id: parseInt(kelas_id),
                hari: hari.toUpperCase(),
                deleted_at: null,
                OR: [
                    // Case 1: Jadwal baru dimulai saat jadwal existing berlangsung
                    {
                        AND: [
                            { jam_mulai: { lte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                            { jam_selesai: { gt: new Date(`1970-01-01T${jamMulaiTime}`) } }
                        ]
                    },
                    // Case 2: Jadwal baru berakhir saat jadwal existing berlangsung
                    {
                        AND: [
                            { jam_mulai: { lt: new Date(`1970-01-01T${jamSelesaiTime}`) } },
                            { jam_selesai: { gte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                        ]
                    },
                    // Case 3: Jadwal baru membungkus jadwal existing
                    {
                        AND: [
                            { jam_mulai: { gte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                            { jam_selesai: { lte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                        ]
                    },
                    // Case 4: Jadwal existing membungkus jadwal baru
                    {
                        AND: [
                            { jam_mulai: { lte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                            { jam_selesai: { gte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                        ]
                    }
                ]
            }
        });

        if (conflictKelas) {
            return res.status(409).json({
                success: false,
                message: "Jadwal bentrok dengan jadwal kelas lain pada waktu yang sama"
            });
        }

        // Cek konflik jadwal guru
        const conflictGuru = await prisma.jadwal.findFirst({
            where: {
                guru_id: parseInt(guru_id),
                hari: hari.toUpperCase(),
                deleted_at: null,
                OR: [
                    // Case 1: Jadwal baru dimulai saat jadwal existing berlangsung
                    {
                        AND: [
                            { jam_mulai: { lte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                            { jam_selesai: { gt: new Date(`1970-01-01T${jamMulaiTime}`) } }
                        ]
                    },
                    // Case 2: Jadwal baru berakhir saat jadwal existing berlangsung
                    {
                        AND: [
                            { jam_mulai: { lt: new Date(`1970-01-01T${jamSelesaiTime}`) } },
                            { jam_selesai: { gte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                        ]
                    },
                    // Case 3: Jadwal baru membungkus jadwal existing
                    {
                        AND: [
                            { jam_mulai: { gte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                            { jam_selesai: { lte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                        ]
                    },
                    // Case 4: Jadwal existing membungkus jadwal baru
                    {
                        AND: [
                            { jam_mulai: { lte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                            { jam_selesai: { gte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                        ]
                    }
                ]
            }
        });

        if (conflictGuru) {
            return res.status(409).json({
                success: false,
                message: "Guru sudah memiliki jadwal mengajar pada waktu yang sama"
            });
        }

        // Buat jadwal baru
        const newJadwal = await prisma.jadwal.create({
            data: {
                hari: hari.toUpperCase(),
                kelas_id: parseInt(kelas_id),
                mapel_id: parseInt(mapel_id),
                guru_id: parseInt(guru_id),
                jam_mulai: new Date(`1970-01-01T${jamMulaiTime}`),
                jam_selesai: new Date(`1970-01-01T${jamSelesaiTime}`)
            },
            include: {
                kelas: {
                    select: {
                        kelas: true,
                        jurusan: true,
                    }
                },
                mata_pelajaran: {
                    select: {
                        nama_mapel: true
                    }
                },
                guru: {
                    select: {
                        nama: true
                    }
                }
            }
        });

        // Format response
        const formattedJadwal = {
            id: newJadwal.id,
            hari: newJadwal.hari,
            jam_mulai: formatTime(newJadwal.jam_mulai),
            jam_selesai: formatTime(newJadwal.jam_selesai),
            jam_lengkap: `${formatTime(newJadwal.jam_mulai)} - ${formatTime(newJadwal.jam_selesai)}`,
            kelas: newJadwal.kelas,
            mata_pelajaran: newJadwal.mata_pelajaran,
            guru: newJadwal.guru,
            created_at: formatDateTime(newJadwal.created_at)
        };

        return res.status(201).json({
            success: true,
            message: "Berhasil menambahkan jadwal baru",
            data: formattedJadwal
        });

    } catch (error) {
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

        // Validasi input 
        if (!hari || !kelas_id || !mapel_id || !guru_id || !jam_mulai || !jam_selesai) {
            return res.status(400).json({
                success: false,
                message: "Semua field harus terisi"
            });
        }

        // Validasi hari
        if (!validateHari(hari)) {
            return res.status(400).json({
                success: false,
                message: "Hari tidak valid (gunakan: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU)"
            });
        }

        // Validasi format waktu
        if (!validateTimeFormat(jam_mulai) || !validateTimeFormat(jam_selesai)) {
            return res.status(400).json({
                success: false,
                message: "Format jam tidak valid (gunakan HH:MM)"
            });
        }

        // Cek jadwal apakah ada
        const existingJadwal = await prisma.jadwal.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            }
        });

        if (!existingJadwal) {
            return res.status(404).json({
                success: false,
                message: "Jadwal tidak ditemukan"
            });
        }

        // Validasi kelas, mapel, guru exists
        const [kelasExists, mapelExists, guruExists] = await Promise.all([
            prisma.kelas.findFirst({
                where: { id: parseInt(kelas_id), deleted_at: null }
            }),
            prisma.mataPelajaran.findFirst({
                where: { id: parseInt(mapel_id), deleted_at: null }
            }),
            prisma.guru.findFirst({
                where: { id: parseInt(guru_id), deleted_at: null }
            })
        ]);

        if (!kelasExists) {
            return res.status(404).json({
                success: false,
                message: "Kelas tidak ditemukan"
            });
        }

        if (!mapelExists) {
            return res.status(404).json({
                success: false,
                message: "Mata pelajaran tidak ditemukan"
            });
        }

        if (!guruExists) {
            return res.status(404).json({
                success: false,
                message: "Guru tidak ditemukan"
            });
        }

        // Konversi jam ke format Time
        const jamMulaiTime = `${jam_mulai}:00`;
        const jamSelesaiTime = `${jam_selesai}:00`;

        // Validasi jam selesai harus setelah jam mulai
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

        // Cek konflik dengan semua 4 kondisi overlap
        const [conflictKelas, conflictGuru] = await Promise.all([
            prisma.jadwal.findFirst({
                where: {
                    kelas_id: parseInt(kelas_id),
                    hari: hari.toUpperCase(),
                    deleted_at: null,
                    NOT: { id: parseInt(id) },
                    OR: [
                        {
                            AND: [
                                { jam_mulai: { lte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                                { jam_selesai: { gt: new Date(`1970-01-01T${jamMulaiTime}`) } }
                            ]
                        },
                        {
                            AND: [
                                { jam_mulai: { lt: new Date(`1970-01-01T${jamSelesaiTime}`) } },
                                { jam_selesai: { gte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                            ]
                        },
                        {
                            AND: [
                                { jam_mulai: { gte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                                { jam_selesai: { lte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                            ]
                        },
                        {
                            AND: [
                                { jam_mulai: { lte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                                { jam_selesai: { gte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                            ]
                        }
                    ]
                }
            }),
            prisma.jadwal.findFirst({
                where: {
                    guru_id: parseInt(guru_id),
                    hari: hari.toUpperCase(),
                    deleted_at: null,
                    NOT: { id: parseInt(id) },
                    OR: [
                        {
                            AND: [
                                { jam_mulai: { lte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                                { jam_selesai: { gt: new Date(`1970-01-01T${jamMulaiTime}`) } }
                            ]
                        },
                        {
                            AND: [
                                { jam_mulai: { lt: new Date(`1970-01-01T${jamSelesaiTime}`) } },
                                { jam_selesai: { gte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                            ]
                        },
                        {
                            AND: [
                                { jam_mulai: { gte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                                { jam_selesai: { lte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                            ]
                        },
                        {
                            AND: [
                                { jam_mulai: { lte: new Date(`1970-01-01T${jamMulaiTime}`) } },
                                { jam_selesai: { gte: new Date(`1970-01-01T${jamSelesaiTime}`) } }
                            ]
                        }
                    ]
                }
            })
        ]);

        if (conflictKelas) {
            return res.status(409).json({
                success: false,
                message: "Jadwal bentrok dengan jadwal kelas lain"
            });
        }

        if (conflictGuru) {
            return res.status(409).json({
                success: false,
                message: "Guru sudah memiliki jadwal pada waktu yang sama"
            });
        }

        // Update jadwal
        const updatedJadwal = await prisma.jadwal.update({
            where: {
                id: parseInt(id)
            },
            data: {
                hari: hari.toUpperCase(),
                kelas_id: parseInt(kelas_id),
                mapel_id: parseInt(mapel_id),
                guru_id: parseInt(guru_id),
                jam_mulai: new Date(`1970-01-01T${jamMulaiTime}`),
                jam_selesai: new Date(`1970-01-01T${jamSelesaiTime}`),
                updated_at: new Date()
            },
            include: {
                kelas: {
                    select: {
                        kelas: true,
                        jurusan: true,
                    }
                },
                mata_pelajaran: {
                    select: {
                        nama_mapel: true
                    }
                },
                guru: {
                    select: {
                        nama: true
                    }
                }
            }
        });

        // Format response
        const formattedJadwal = {
            id: updatedJadwal.id,
            hari: updatedJadwal.hari,
            jam_mulai: formatTime(updatedJadwal.jam_mulai),
            jam_selesai: formatTime(updatedJadwal.jam_selesai),
            jam_lengkap: `${formatTime(updatedJadwal.jam_mulai)} - ${formatTime(updatedJadwal.jam_selesai)}`,
            kelas: updatedJadwal.kelas,
            mata_pelajaran: updatedJadwal.mata_pelajaran,
            guru: updatedJadwal.guru,
            updated_at: formatDateTime(updatedJadwal.updated_at)
        };

        return res.status(200).json({
            success: true,
            message: "Berhasil mengupdate jadwal",
            data: formattedJadwal
        });
    } catch (error) {
        console.error("Error updating jadwal:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// delete jadwal 
const deleteJadwal = async (req, res) => {
    try {
        const { id } = req.params;

        // Cek apakah jadwal ada
        const existingJadwal = await prisma.jadwal.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            }
        });

        if (!existingJadwal) {
            return res.status(404).json({
                success: false,
                message: "Jadwal tidak ditemukan"
            });
        }

        // Soft delete jadwal 
        await prisma.jadwal.update({
            where: {
                id: parseInt(id)
            },
            data: {
                deleted_at: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil menghapus jadwal"
        });
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
            return res.status(400).json({
                success: false,
                message: "File XLSX wajib diunggah"
            });
        }

        // Parse XLSX dari buffer
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);

        // Cari sheet TEMPLATE_JADWAL
        const ws = workbook.getWorksheet("TEMPLATE_JADWAL");
        if (!ws) {
            return res.status(400).json({
                success: false,
                message: "Sheet 'TEMPLATE_JADWAL' tidak ditemukan dalam file"
            });
        }

        // Ambil header dari baris pertama yang berisi kolom header
        // Template: baris 1=title, 2=subtitle, 3=header, 4+=data
        // Header HARUS: HARI, KELAS, JURUSAN, NAMA_MAPEL, NAMA_GURU, JAM_MULAI, JAM_SELESAI
        const REQUIRED_HEADERS = ["HARI", "KELAS", "JURUSAN", "NAMA_MAPEL", "NAMA_GURU", "JAM_MULAI", "JAM_SELESAI"];
        let headerRowNum = null;
        let colMap = {};

        ws.eachRow((row, rowNum) => {
            if (headerRowNum) return;
            const vals = row.values.slice(1).map(v => String(v || "").trim().toUpperCase());
            const found = REQUIRED_HEADERS.every(h => vals.includes(h));
            if (found) {
                headerRowNum = rowNum;
                vals.forEach((v, i) => { colMap[v] = i + 1; });
            }
        });

        if (!headerRowNum) {
            return res.status(400).json({
                success: false,
                message: "Header kolom tidak ditemukan. Pastikan baris header memuat: " + REQUIRED_HEADERS.join(", ")
            });
        }

        // Ambil semua lookup data sekaligus
        const [allKelas, allMapel, allGuru] = await Promise.all([
            prisma.kelas.findMany({ where: { deleted_at: null }, select: { id: true, kelas: true, jurusan: true } }),
            prisma.mataPelajaran.findMany({ where: { deleted_at: null }, select: { id: true, nama_mapel: true } }),
            prisma.guru.findMany({ where: { deleted_at: null }, select: { id: true, nama: true } }),
        ]);

        // Build lookup maps (case-insensitive)
        const mapelMap = new Map(allMapel.map(m => [m.nama_mapel.toLowerCase().trim(), m.id]));
        const guruMap  = new Map(allGuru.map(g => [g.nama.toLowerCase().trim(), g.id]));
        const kelasMap = new Map(allKelas.map(k => [`${String(k.kelas).toLowerCase().trim()}|${k.jurusan.toLowerCase().trim()}`, k.id]));

        const results = { created: 0, skipped: 0, errors: [] };

        const dataRows = [];
        ws.eachRow((row, rowNum) => {
            if (rowNum <= headerRowNum) return;
            dataRows.push({ row, rowNum });
        });

        for (const { row, rowNum } of dataRows) {
            const getCellText = (col) => {
                const cell = row.getCell(col);
                const v = cell.value;
                if (v === null || v === undefined) return "";
                if (typeof v === "object" && v.text) return String(v.text).trim();
                return String(v).trim();
            };

            const hari       = getCellText(colMap["HARI"]).toUpperCase();
            const kelasStr   = getCellText(colMap["KELAS"]);
            const jurusanStr = getCellText(colMap["JURUSAN"]);
            const namaMapel  = getCellText(colMap["NAMA_MAPEL"]);
            const namaGuru   = getCellText(colMap["NAMA_GURU"]);
            const jamMulai   = getCellText(colMap["JAM_MULAI"]);
            const jamSelesai = getCellText(colMap["JAM_SELESAI"]);

            // Lewati baris kosong
            if (!hari && !namaMapel && !namaGuru) continue;

            // Validasi hari
            if (!validateHari(hari)) {
                results.errors.push({ row: rowNum, pesan: `Hari tidak valid: "${hari}"` });
                results.skipped++;
                continue;
            }

            // Validasi waktu
            if (!validateTimeFormat(jamMulai) || !validateTimeFormat(jamSelesai)) {
                results.errors.push({ row: rowNum, pesan: `Format jam tidak valid: "${jamMulai}" - "${jamSelesai}"` });
                results.skipped++;
                continue;
            }

            // Resolusi ID
            const kelasKey = `${kelasStr.toLowerCase()}|${jurusanStr.toLowerCase()}`;
            const kelas_id  = kelasMap.get(kelasKey);
            const mapel_id  = mapelMap.get(namaMapel.toLowerCase());
            const guru_id   = guruMap.get(namaGuru.toLowerCase());

            if (!kelas_id) {
                results.errors.push({ row: rowNum, pesan: `Kelas "${kelasStr} ${jurusanStr}" tidak ditemukan` });
                results.skipped++;
                continue;
            }
            if (!mapel_id) {
                results.errors.push({ row: rowNum, pesan: `Mata pelajaran "${namaMapel}" tidak ditemukan` });
                results.skipped++;
                continue;
            }
            if (!guru_id) {
                results.errors.push({ row: rowNum, pesan: `Guru "${namaGuru}" tidak ditemukan` });
                results.skipped++;
                continue;
            }

            const jamMulaiTime   = `${jamMulai}:00`;
            const jamSelesaiTime = `${jamSelesai}:00`;

            // Validasi jam selesai > jam mulai
            const [mH, mM] = jamMulai.split(":").map(Number);
            const [sH, sM] = jamSelesai.split(":").map(Number);
            if (sH * 60 + sM <= mH * 60 + mM) {
                results.errors.push({ row: rowNum, pesan: `Jam selesai (${jamSelesai}) harus setelah jam mulai (${jamMulai})` });
                results.skipped++;
                continue;
            }

            // Cek konflik kelas & guru
            const overlapOr = [
                { AND: [{ jam_mulai: { lte: new Date(`1970-01-01T${jamMulaiTime}`) } }, { jam_selesai: { gt: new Date(`1970-01-01T${jamMulaiTime}`) } }] },
                { AND: [{ jam_mulai: { lt: new Date(`1970-01-01T${jamSelesaiTime}`) } }, { jam_selesai: { gte: new Date(`1970-01-01T${jamSelesaiTime}`) } }] },
                { AND: [{ jam_mulai: { gte: new Date(`1970-01-01T${jamMulaiTime}`) } }, { jam_selesai: { lte: new Date(`1970-01-01T${jamSelesaiTime}`) } }] },
                { AND: [{ jam_mulai: { lte: new Date(`1970-01-01T${jamMulaiTime}`) } }, { jam_selesai: { gte: new Date(`1970-01-01T${jamSelesaiTime}`) } }] },
            ];

            const [conflictKelas, conflictGuru] = await Promise.all([
                prisma.jadwal.findFirst({ where: { kelas_id, hari, deleted_at: null, OR: overlapOr } }),
                prisma.jadwal.findFirst({ where: { guru_id, hari, deleted_at: null, OR: overlapOr } }),
            ]);

            if (conflictKelas) {
                results.errors.push({ row: rowNum, pesan: `Jadwal kelas bentrok pada hari ${hari} jam ${jamMulai}-${jamSelesai}` });
                results.skipped++;
                continue;
            }
            if (conflictGuru) {
                results.errors.push({ row: rowNum, pesan: `Jadwal guru "${namaGuru}" bentrok pada hari ${hari} jam ${jamMulai}-${jamSelesai}` });
                results.skipped++;
                continue;
            }

            // Cek duplikat berdasarkan unique constraint
            const duplicate = await prisma.jadwal.findFirst({
                where: {
                    kelas_id,
                    hari,
                    jam_mulai: new Date(`1970-01-01T${jamMulaiTime}`),
                    deleted_at: null,
                }
            });

            if (duplicate) {
                results.errors.push({ row: rowNum, pesan: `Jadwal duplikat: kelas & jam sudah ada untuk hari ${hari}` });
                results.skipped++;
                continue;
            }

            // Buat jadwal
            await prisma.jadwal.create({
                data: {
                    hari,
                    kelas_id,
                    mapel_id,
                    guru_id,
                    jam_mulai:   new Date(`1970-01-01T${jamMulaiTime}`),
                    jam_selesai: new Date(`1970-01-01T${jamSelesaiTime}`),
                }
            });
            results.created++;
        }

        return res.status(201).json({
            success: true,
            message: `Import selesai: ${results.created} jadwal berhasil dibuat, ${results.skipped} dilewati.`,
            data: results
        });

    } catch (error) {
        console.error("Error importing jadwal:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat import",
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