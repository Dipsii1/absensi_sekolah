const prisma = require("../config/prisma");
const { sendTapInNotification, sendTapOutNotification } = require("../services/telegramServices");
const { formatDate, formatTime, formatDateTime, getHariFromDate, getTodayStrWIB, toDateOnly, getTanggalRangeWIB } = require("../helper/indexUtils");

// Tap In 
const tapIn = async (req, res) => {
    try {
        const { uid_rfid } = req.body;

        if (!uid_rfid) {
            return res.status(400).json({
                success: false,
                message: "UID RFID harus terisi"
            });
        }

        const rfid = await prisma.rFID.findFirst({
            where: {
                uid_rfid,
                is_active: true,
                deleted_at: null
            },
            include: {
                siswa: {
                    include: {
                        kelas: true,
                        orang_tua: true
                    }
                }
            }
        });

        if (!rfid) {
            return res.status(404).json({
                success: false,
                message: "RFID tidak ditemukan atau tidak aktif"
            });
        }

        if (!rfid.siswa.kelas) {
            return res.status(400).json({
                success: false,
                message: "Siswa tidak memiliki kelas"
            });
        }
        
        const todayStr = getTodayStrWIB();
        const todayDate = toDateOnly(todayStr);

        const existingAbsensi = await prisma.absensiSiswa.findFirst({
            where: {
                siswa_id: rfid.siswa.id,
                tanggal: todayDate,
                tap_in: { not: null },
                deleted_at: null
            }
        });

        if (existingAbsensi) {
            return res.status(409).json({
                success: false,
                message: "Siswa sudah melakukan tap in hari ini"
            });
        }

        const hariIni = getHariFromDate(new Date());

        if (hariIni === 'MINGGU') {
            return res.status(400).json({
                success: false,
                message: "Tidak ada jadwal di hari Minggu"
            });
        }

        const jadwalPertama = await prisma.jadwal.findFirst({
            where: {
                kelas_id: rfid.siswa.kelas_id,
                hari: hariIni,
                deleted_at: null
            },
            include: {
                mata_pelajaran: true
            },
            orderBy: {
                jam_mulai: 'asc'
            }
        });

        if (!jadwalPertama) {
            return res.status(404).json({
                success: false,
                message: `Tidak ada jadwal untuk kelas ${rfid.siswa.kelas.kelas} ${rfid.siswa.kelas.jurusan} di hari ${hariIni}`
            });
        }

        const tapInTime = new Date();

        const jamMulai = new Date(jadwalPertama.jam_mulai);
        const jamMulaiToday = new Date();
        jamMulaiToday.setHours(jamMulai.getHours(), jamMulai.getMinutes(), 0, 0);

        const statusTapIn = tapInTime <= jamMulaiToday ? 'Tepat_Waktu' : 'Terlambat';

        const absensi = await prisma.absensiSiswa.create({
            data: {
                siswa_id: rfid.siswa.id,
                tanggal: todayDate,
                tap_in: tapInTime,
                rfid_id: rfid.id,
                status_tapin: statusTapIn,
                status_harian: 'Hadir'
            },
            include: {
                siswa: {
                    select: {
                        nama: true,
                        kelas: {
                            select: {
                                kelas: true,
                                jurusan: true
                            }
                        }
                    }
                },
                rfid: {
                    select: {
                        uid_rfid: true
                    }
                }
            }
        });

        if (rfid.siswa.kelas && rfid.siswa.kelas.telegram_group_id) {
            const notifData = {
                nama: rfid.siswa.nama,
                kelas: `${rfid.siswa.kelas.kelas} ${rfid.siswa.kelas.jurusan}`,
                status_tapin: statusTapIn,
                tap_in: formatTime(tapInTime),
                tanggal: formatDate(todayDate),
            };

            sendTapInNotification(rfid.siswa.kelas.telegram_group_id, notifData)
                .catch(error => {
                    console.error('Failed to send Telegram notification:', error);
                });
        }

        const formattedAbsensi = {
            id: absensi.id,
            siswa: absensi.siswa,
            tanggal: formatDate(absensi.tanggal),
            tap_in: formatTime(absensi.tap_in),
            tap_out: formatTime(absensi.tap_out),
            status_tapin: absensi.status_tapin,
            rfid: absensi.rfid,
            jadwal_info: {
                hari: hariIni,
                mata_pelajaran_pertama: jadwalPertama.mata_pelajaran.nama_mapel,
                jam_mulai: formatTime(jadwalPertama.jam_mulai),
                jam_selesai: formatTime(jadwalPertama.jam_selesai)
            },
            created_at: formatDateTime(absensi.created_at)
        };

        return res.status(201).json({
            success: true,
            message: `Tap in berhasil - ${statusTapIn}`,
            data: formattedAbsensi
        });

    } catch (error) {
        console.error("Error tap in:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// Tap Out 
const tapOut = async (req, res) => {
    try {
        const { uid_rfid } = req.body;

        if (!uid_rfid) {
            return res.status(400).json({
                success: false,
                message: "UID RFID harus terisi"
            });
        }

        const rfid = await prisma.rFID.findFirst({
            where: {
                uid_rfid,
                is_active: true,
                deleted_at: null
            },
            include: {
                siswa: {
                    include: {
                        kelas: true,
                        orang_tua: true
                    }
                }
            }
        });

        if (!rfid) {
            return res.status(404).json({
                success: false,
                message: "RFID tidak ditemukan atau tidak aktif"
            });
        }

        if (!rfid.siswa.kelas) {
            return res.status(400).json({
                success: false,
                message: "Siswa tidak memiliki kelas"
            });
        }

        const todayStr = getTodayStrWIB();
        const todayDate = toDateOnly(todayStr);
        const hariIni = getHariFromDate(new Date());
        const currentTime = new Date();

        if (hariIni === 'MINGGU') {
            return res.status(400).json({
                success: false,
                message: "Tidak ada jadwal di hari Minggu"
            });
        }

        // Ambil jadwal terakhir hari ini untuk menentukan jam pulang
        const jadwalTerakhir = await prisma.jadwal.findFirst({
            where: {
                kelas_id: rfid.siswa.kelas_id,
                hari: hariIni,
                deleted_at: null
            },
            include: {
                mata_pelajaran: true
            },
            orderBy: {
                jam_selesai: 'desc'
            }
        });

        if (!jadwalTerakhir) {
            return res.status(404).json({
                success: false,
                message: `Tidak ada jadwal untuk kelas ${rfid.siswa.kelas.kelas} ${rfid.siswa.kelas.jurusan} di hari ${hariIni}`
            });
        }

        // Tentukan jam pulang dari jadwal terakhir
        const jamSelesai = new Date(jadwalTerakhir.jam_selesai);
        const jamPulangToday = new Date();
        jamPulangToday.setHours(jamSelesai.getHours(), jamSelesai.getMinutes(), 0, 0);

        // jika belum jam pulang, maka proses sebagai tap in
        if (currentTime < jamPulangToday) {

            const existingAbsensi = await prisma.absensiSiswa.findFirst({
                where: {
                    siswa_id: rfid.siswa.id,
                    tanggal: todayDate,
                    tap_in: { not: null },
                    deleted_at: null
                }
            });

            if (existingAbsensi) {
                return res.status(409).json({
                    success: false,
                    message: "Siswa sudah melakukan tap in hari ini"
                });
            }

            // Ambil jadwal pertama untuk menentukan status tap in
            const jadwalPertama = await prisma.jadwal.findFirst({
                where: {
                    kelas_id: rfid.siswa.kelas_id,
                    hari: hariIni,
                    deleted_at: null
                },
                include: {
                    mata_pelajaran: true
                },
                orderBy: {
                    jam_mulai: 'asc'
                }
            });

            const tapInTime = new Date();

            const jamMulai = new Date(jadwalPertama.jam_mulai);
            const jamMulaiToday = new Date();
            jamMulaiToday.setHours(jamMulai.getHours(), jamMulai.getMinutes(), 0, 0);

            const statusTapIn = tapInTime <= jamMulaiToday ? 'Tepat_Waktu' : 'Terlambat';

            const absensi = await prisma.absensiSiswa.create({
                data: {
                    siswa_id: rfid.siswa.id,
                    tanggal: todayDate,
                    tap_in: tapInTime,
                    rfid_id: rfid.id,
                    status_tapin: statusTapIn,
                    status_harian: 'Hadir'
                },
                include: {
                    siswa: {
                        select: {
                            nama: true,
                            kelas: {
                                select: {
                                    kelas: true,
                                    jurusan: true
                                }
                            }
                        }
                    },
                    rfid: {
                        select: {
                            uid_rfid: true
                        }
                    }
                }
            });

            if (rfid.siswa.kelas && rfid.siswa.kelas.telegram_group_id) {
                const notifData = {
                    nama: rfid.siswa.nama,
                    kelas: `${rfid.siswa.kelas.kelas} ${rfid.siswa.kelas.jurusan}`,
                    status_tapin: statusTapIn,
                    tap_in: formatTime(tapInTime),
                    tanggal: formatDate(todayDate),
                };

                sendTapInNotification(rfid.siswa.kelas.telegram_group_id, notifData)
                    .catch(error => {
                        console.error('Failed to send Telegram notification:', error);
                    });
            }

            const formattedAbsensi = {
                id: absensi.id,
                siswa: absensi.siswa,
                tanggal: formatDate(absensi.tanggal),
                tap_in: formatTime(absensi.tap_in),
                tap_out: formatTime(absensi.tap_out),
                status_tapin: absensi.status_tapin,
                rfid: absensi.rfid,
                jadwal_info: {
                    hari: hariIni,
                    mata_pelajaran_pertama: jadwalPertama.mata_pelajaran.nama_mapel,
                    jam_mulai: formatTime(jadwalPertama.jam_mulai),
                    jam_selesai: formatTime(jadwalPertama.jam_selesai)
                },
                created_at: formatDateTime(absensi.created_at)
            };

            return res.status(201).json({
                success: true,
                message: `Tap in berhasil - ${statusTapIn} (otomatis, belum jam pulang)`,
                data: formattedAbsensi
            });
        }

        // jika sudah jam pulang, maka proses sebagai tap out
        const absensiTapIn = await prisma.absensiSiswa.findFirst({
            where: {
                siswa_id: rfid.siswa_id,
                tanggal: todayDate,
                tap_in: { not: null },
                deleted_at: null
            }
        });

        if (!absensiTapIn) {
            return res.status(404).json({
                success: false,
                message: "Belum melakukan tap in hari ini"
            });
        }

        const existingTapOut = await prisma.absensiSiswa.findFirst({
            where: {
                siswa_id: rfid.siswa_id,
                tanggal: todayDate,
                tap_out: { not: null },
                deleted_at: null
            }
        });

        if (existingTapOut) {
            return res.status(409).json({
                success: false,
                message: "Sudah melakukan tap out hari ini"
            });
        }

        const tapOutTime = new Date();

        const updatedAbsensi = await prisma.absensiSiswa.update({
            where: { id: absensiTapIn.id },
            data: {
                tap_out: tapOutTime
            },
            include: {
                siswa: {
                    select: {
                        nama: true,
                        kelas: {
                            select: {
                                kelas: true,
                                jurusan: true
                            }
                        }
                    }
                },
                rfid: {
                    select: {
                        uid_rfid: true
                    }
                }
            }
        });

        if (rfid.siswa.kelas && rfid.siswa.kelas.telegram_group_id) {
            const notifData = {
                nama: rfid.siswa.nama,
                kelas: `${rfid.siswa.kelas.kelas} ${rfid.siswa.kelas.jurusan}`,
                tap_out: formatTime(tapOutTime),
                tanggal: formatDate(todayDate),
            };

            sendTapOutNotification(rfid.siswa.kelas.telegram_group_id, notifData)
                .catch(error => {
                    console.error('Failed to send Telegram notification:', error);
                });
        }

        const formattedAbsensi = {
            id: updatedAbsensi.id,
            siswa: updatedAbsensi.siswa,
            tanggal: formatDate(updatedAbsensi.tanggal),
            tap_in: formatTime(updatedAbsensi.tap_in),
            tap_out: formatTime(updatedAbsensi.tap_out),
            status_tapin: updatedAbsensi.status_tapin,
            rfid: updatedAbsensi.rfid,
            updated_at: formatDateTime(updatedAbsensi.updated_at)
        };

        return res.status(200).json({
            success: true,
            message: "Tap out berhasil",
            data: formattedAbsensi
        });

    } catch (error) {
        console.error("Error tap out:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// Get all absensi dengan pagination dan filter
const getAllAbsensi = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { tanggal, tanggal_mulai, tanggal_akhir, siswa_id, kelas_id, status_tapin } = req.query;

        const whereCondition = { deleted_at: null };

        if (tanggal) {
            whereCondition.tanggal = toDateOnly(tanggal);
        } else if (tanggal_mulai && tanggal_akhir) {
            whereCondition.tanggal = {
                gte: toDateOnly(tanggal_mulai),
                lte: toDateOnly(tanggal_akhir)
            };
        }

        if (siswa_id) whereCondition.siswa_id = siswa_id;

        if (kelas_id) {
            whereCondition.siswa = {
                kelas_id: parseInt(kelas_id)
            };
        }

        if (status_tapin) whereCondition.status_tapin = status_tapin;

        const [data, total] = await Promise.all([
            prisma.absensiSiswa.findMany({
                where: whereCondition,
                skip,
                take: limit,
                orderBy: { created_at: "desc" },
                include: {
                    siswa: {
                        select: {
                            nama: true,
                            kelas: {
                                select: {
                                    kelas: true,
                                    jurusan: true,
                                    tahun: {
                                        select: {
                                            tahun_ajaran: true,
                                            is_active: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    rfid: {
                        select: { uid_rfid: true }
                    }
                }
            }),
            prisma.absensiSiswa.count({ where: whereCondition })
        ]);

        const formattedData = data.map(absensi => ({
            id: absensi.id,
            siswa: absensi.siswa,
            tanggal: formatDate(absensi.tanggal),
            tap_in: formatTime(absensi.tap_in),
            tap_out: formatTime(absensi.tap_out),
            status_tapin: absensi.status_tapin,
            rfid: absensi.rfid,
            created_at: formatDateTime(absensi.created_at),
            updated_at: formatDateTime(absensi.updated_at)
        }));

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil seluruh data absensi siswa",
            data: formattedData,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error getting absensi:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// Get absensi by ID
const getAbsensiById = async (req, res) => {
    try {
        const { id } = req.params;

        const absensi = await prisma.absensiSiswa.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            },
            include: {
                siswa: {
                    select: {
                        nama: true,
                        kelas: {
                            select: {
                                kelas: true,
                                jurusan: true,
                                tahun: {
                                    select: {
                                        tahun_ajaran: true,
                                        is_active: true
                                    }
                                }
                            }
                        }
                    }
                },
                rfid: {
                    select: { uid_rfid: true }
                },
                detail: {
                    where: { deleted_at: null },
                    include: {
                        jadwal: {
                            include: {
                                mata_pelajaran: true,
                                guru: {
                                    select: {
                                        nama: true,
                                        NIP: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!absensi) {
            return res.status(404).json({
                success: false,
                message: "Absensi tidak ditemukan"
            });
        }

        const formattedDetail = absensi.detail.map(detail => ({
            id: detail.id,
            status: detail.status,
            jam_absen: formatDateTime(detail.jam_absen),
            keterangan: detail.keterangan,
            jadwal: {
                id: detail.jadwal.id,
                hari: detail.jadwal.hari,
                jam_mulai: formatTime(detail.jadwal.jam_mulai),
                jam_selesai: formatTime(detail.jadwal.jam_selesai),
                mata_pelajaran: detail.jadwal.mata_pelajaran,
                guru: detail.jadwal.guru
            }
        }));

        const formattedAbsensi = {
            id: absensi.id,
            siswa: absensi.siswa,
            tanggal: formatDate(absensi.tanggal),
            tap_in: formatTime(absensi.tap_in),
            tap_out: formatTime(absensi.tap_out),
            status_tapin: absensi.status_tapin,
            rfid: absensi.rfid,
            detail: formattedDetail,
            created_at: formatDateTime(absensi.created_at),
            updated_at: formatDateTime(absensi.updated_at)
        };

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data absensi",
            data: formattedAbsensi
        });

    } catch (error) {
        console.error("Error getting absensi by id:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// Get laporan range
const getLaporanRange = async (req, res) => {
    try {
        const { tanggal_mulai, tanggal_akhir, kelas_id } = req.query;

        if (!tanggal_mulai || !tanggal_akhir) {
            return res.status(400).json({
                success: false,
                message: "tanggal_mulai dan tanggal_akhir harus diisi"
            });
        }

        const whereCondition = {
            deleted_at: null,
            tanggal: {
                gte: toDateOnly(tanggal_mulai),
                lte: toDateOnly(tanggal_akhir)
            }
        };

        if (kelas_id) {
            whereCondition.siswa = { kelas_id: parseInt(kelas_id) };
        }

        const absensiList = await prisma.absensiSiswa.findMany({
            where: {
                ...whereCondition,
                OR: [
                    { status_harian: 'Hadir' },
                    {
                        status_harian: null,
                        tap_in: { not: null }
                    }
                ]
            },
            select: { tanggal: true }
        });

        // Group by tanggal dalam WIB
        const grouped = {};
        absensiList.forEach(a => {
            const key = a.tanggal.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
            grouped[key] = (grouped[key] || 0) + 1;
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil laporan absensi range",
            data: grouped
        });

    } catch (error) {
        console.error("Error getLaporanRange:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// Get laporan absensi harian
const getLaporanHarian = async (req, res) => {
    try {
        const { tanggal, kelas_id } = req.query;

        if (!tanggal) {
            return res.status(400).json({
                success: false,
                message: "Tanggal harus terisi"
            });
        }

        const whereCondition = {
            tanggal: toDateOnly(tanggal),
            deleted_at: null
        };

        if (kelas_id) {
            whereCondition.siswa = {
                kelas_id: parseInt(kelas_id)
            };
        }

        const absensiList = await prisma.absensiSiswa.findMany({
            where: whereCondition,
            include: {
                siswa: {
                    select: {
                        nama: true,
                        kelas: {
                            select: {
                                kelas: true,
                                jurusan: true
                            }
                        }
                    }
                }
            },
            orderBy: { tap_in: 'asc' }
        });

        const summary = {
            total: absensiList.length,
            Tepat_Waktu: absensiList.filter(a => a.status_tapin === 'Tepat_Waktu').length,
            Terlambat: absensiList.filter(a => a.status_tapin === 'Terlambat').length,
            belum_tap_in: absensiList.filter(a => !a.tap_in).length,
            belum_tap_out: absensiList.filter(a => a.tap_in && !a.tap_out).length
        };

        const formattedData = absensiList.map(absensi => ({
            id: absensi.id,
            siswa: absensi.siswa,
            tanggal: formatDate(absensi.tanggal),
            tap_in: formatTime(absensi.tap_in),
            tap_out: formatTime(absensi.tap_out),
            status_tapin: absensi.status_tapin,
            status_harian: absensi.status_harian
        }));

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil laporan absensi harian",
            data: formattedData,
            summary
        });

    } catch (error) {
        console.error("Error getting laporan harian:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// Update absensi
const updateAbsensi = async (req, res) => {
    try {
        const { id } = req.params;
        const { tap_in, tap_out, status_tapin } = req.body;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: "ID tidak valid"
            });
        }

        const existingAbsensi = await prisma.absensiSiswa.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            }
        });

        if (!existingAbsensi) {
            return res.status(404).json({
                success: false,
                message: "Absensi tidak ditemukan"
            });
        }

        const updateData = {};

        if (tap_in !== undefined) updateData.tap_in = new Date(tap_in);
        if (tap_out !== undefined) updateData.tap_out = new Date(tap_out);

        if (status_tapin !== undefined) {
            if (!['Tepat_Waktu', 'Terlambat'].includes(status_tapin)) {
                return res.status(400).json({
                    success: false,
                    message: "Status tap in tidak valid"
                });
            }
            updateData.status_tapin = status_tapin;
        }

        const updatedAbsensi = await prisma.absensiSiswa.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                siswa: {
                    select: {
                        nama: true,
                        kelas: {
                            select: {
                                kelas: true,
                                jurusan: true
                            }
                        }
                    }
                },
                rfid: {
                    select: { uid_rfid: true }
                }
            }
        });

        const formattedAbsensi = {
            id: updatedAbsensi.id,
            siswa: updatedAbsensi.siswa,
            tanggal: formatDate(updatedAbsensi.tanggal),
            tap_in: formatTime(updatedAbsensi.tap_in),
            tap_out: formatTime(updatedAbsensi.tap_out),
            status_tapin: updatedAbsensi.status_tapin,
            rfid: updatedAbsensi.rfid,
            updated_at: formatDateTime(updatedAbsensi.updated_at)
        };

        return res.status(200).json({
            success: true,
            message: "Berhasil mengupdate data absensi",
            data: formattedAbsensi
        });

    } catch (error) {
        console.error("Error updating absensi:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// Soft delete absensi
const deleteAbsensi = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: "ID tidak valid"
            });
        }

        const existingAbsensi = await prisma.absensiSiswa.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            }
        });

        if (!existingAbsensi) {
            return res.status(404).json({
                success: false,
                message: "Absensi tidak ditemukan"
            });
        }

        await prisma.detailAbsensiSiswa.updateMany({
            where: {
                absensi_id: parseInt(id),
                deleted_at: null
            },
            data: { deleted_at: new Date() }
        });

        await prisma.absensiSiswa.update({
            where: { id: parseInt(id) },
            data: { deleted_at: new Date() }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil menghapus data absensi"
        });

    } catch (error) {
        console.error("Error deleting absensi:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

module.exports = {
    tapIn,
    tapOut,
    getAllAbsensi,
    getAbsensiById,
    getLaporanHarian,
    getLaporanRange,
    updateAbsensi,
    deleteAbsensi
};