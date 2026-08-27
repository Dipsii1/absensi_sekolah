const prisma = require("../config/prisma");
const { sendTapInNotification, sendTapOutNotification } = require("../services/telegramServices");
const { formatDate, formatTime, formatDateTime, getHariFromDate, getTodayStrWIB, toDateOnly, getTanggalRangeWIB } = require("../helper/indexUtils");
const { addTapInJob } = require("../queues/tapInQueue");
const { addTapOutJob } = require("../queues/tapOutQueue");

const validateRfid = async (uid_rfid) => {
    if (!uid_rfid) return { error: { status: 400, message: "UID RFID harus terisi" } };

    const rfid = await prisma.rFID.findFirst({
        where: { uid_rfid, is_active: true, deleted_at: null },
        include: { siswa: { include: { kelas: true, orang_tua: true } } }
    });

    if (!rfid) return { error: { status: 404, message: "RFID tidak ditemukan atau tidak aktif" } };
    if (!rfid.siswa.kelas) return { error: { status: 400, message: "Siswa tidak memiliki kelas" } };

    return { rfid };
};

// Tap In
const tapIn = async (req, res) => {
    try {
        const { uid_rfid } = req.body;
        const { rfid, error } = await validateRfid(uid_rfid);
        if (error) return res.status(error.status).json({ success: false, message: error.message });

        const receivedAt = new Date().toISOString();

        await addTapInJob({
            rfidId: rfid.id,
            siswaId: rfid.siswa.id,
            kelasId: rfid.siswa.kelas_id,
            siswaData: {
                nama: rfid.siswa.nama,
                kelas: rfid.siswa.kelas ? {
                    kelas: rfid.siswa.kelas.kelas,
                    jurusan: rfid.siswa.kelas.jurusan,
                    telegram_group_id: rfid.siswa.kelas.telegram_group_id
                } : null
            },
            receivedAt
        });

        return res.status(202).json({
            success: true,
            message: "Tap in diterima, sedang diproses",
            data: {
                uid_rfid,
                nama: rfid.siswa.nama,
                kelas: rfid.siswa.kelas ? `${rfid.siswa.kelas.kelas} ${rfid.siswa.kelas.jurusan}` : null,
                received_at: receivedAt
            }
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
        const { rfid, error } = await validateRfid(uid_rfid);
        if (error) return res.status(error.status).json({ success: false, message: error.message });

        const receivedAt = new Date().toISOString();

        await addTapOutJob({
            rfidId: rfid.id,
            siswaId: rfid.siswa.id,
            kelasId: rfid.siswa.kelas_id,
            siswaData: {
                nama: rfid.siswa.nama,
                kelas: rfid.siswa.kelas ? {
                    kelas: rfid.siswa.kelas.kelas,
                    jurusan: rfid.siswa.kelas.jurusan,
                    telegram_group_id: rfid.siswa.kelas.telegram_group_id
                } : null
            },
            receivedAt
        });

        return res.status(202).json({
            success: true,
            message: "Tap out diterima, sedang diproses",
            data: {
                uid_rfid,
                nama: rfid.siswa.nama,
                kelas: rfid.siswa.kelas ? `${rfid.siswa.kelas.kelas} ${rfid.siswa.kelas.jurusan}` : null,
                received_at: receivedAt
            }
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

        const tanggalDate = toDateOnly(tanggal);

        const whereCondition = {
            tanggal: tanggalDate,
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
                        nisn: true,
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

        // Hitung jumlah siswa yang sudah difinalisasi untuk tanggal ini
        const siswaIds = absensiList.map((a) => a.siswa_id);
        const finalizedRecords = siswaIds.length
            ? await prisma.finalAbsensi.findMany({
                where: {
                    siswa_id: { in: siswaIds },
                    tanggal: tanggalDate,
                    is_finalized: true,
                    deleted_at: null
                },
                select: { siswa_id: true }
            })
            : [];
        const finalizedSet = new Set(finalizedRecords.map((f) => f.siswa_id));

        const summary = {
            total: absensiList.length,
            Tepat_Waktu: absensiList.filter(a => a.status_tapin === 'Tepat_Waktu').length,
            Terlambat: absensiList.filter(a => a.status_tapin === 'Terlambat').length,
            belum_tap_in: absensiList.filter(a => !a.tap_in).length,
            belum_tap_out: absensiList.filter(a => a.tap_in && !a.tap_out).length,
            sudah_difinalisasi: finalizedSet.size
        };

        const formattedData = absensiList.map(absensi => ({
            id: absensi.id,
            siswa_id: absensi.siswa_id,
            siswa: absensi.siswa,
            nama: absensi.siswa?.nama ?? null,
            nama_kelas: absensi.siswa?.kelas
                ? `${absensi.siswa.kelas.kelas} ${absensi.siswa.kelas.jurusan}`
                : null,
            tanggal: formatDate(absensi.tanggal),
            tap_in: formatTime(absensi.tap_in),
            tap_out: formatTime(absensi.tap_out),
            jam_tap_in: formatTime(absensi.tap_in),
            status_tapin: absensi.status_tapin,
            status_harian: absensi.status_harian,
            is_finalized: finalizedSet.has(absensi.siswa_id)
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