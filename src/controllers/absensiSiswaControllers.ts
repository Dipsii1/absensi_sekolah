import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { sendTapInNotification, sendTapOutNotification } from "../services/telegramServices";
import { formatDate, formatTime, formatDateTime, formatJam, getHariFromDate, getTodayStrWIB, toDateOnly, getTanggalRangeWIB, parseTanggal } from "../helper/indexUtils";
import { addTapInJob } from "../queues/tapInQueue";
import { addTapOutJob } from "../queues/tapOutQueue";
import { tapInQueueEvents, tapOutQueueEvents } from "../helper/queueEvents";
import { hitungStatistikFinal } from "../helper/helperFinalAbsensi";

interface TapJobResult {
  skipped?: boolean;
  reason?: string | null;
  tapInTime?: string | Date | null;
  tapOutTime?: string | Date | null;
  statusTapIn?: string | null;
}

const validateRfid = async (uid_rfid: string) => {
    if (!uid_rfid) return { error: { status: 400, message: "UID RFID harus terisi" } };

    const rfid = await prisma.rFID.findFirst({
        where: { uid_rfid, is_active: true, deleted_at: null },
        include: { siswa: { include: { kelas: true, orang_tua: true } } }
    });

    if (!rfid) return { error: { status: 404, message: "RFID tidak ditemukan atau tidak aktif" } };
    if (!rfid.siswa.kelas) return { error: { status: 400, message: "Siswa tidak memiliki kelas" } };

    return { rfid };
};

const JOB_TIMEOUT_MS = 5000; // 5 detik

// Tap In
export const tapIn = async (req: Request, res: Response) => {
    try {
        const { uid_rfid } = req.body;
        const { rfid, error } = await validateRfid(uid_rfid);
        if (error) return res.status(error.status).json({ success: false, message: error.message });

        const receivedAt = new Date().toISOString();

        const job = await addTapInJob({
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

        let result: TapJobResult;
        try {
            result = (await job.waitUntilFinished(tapInQueueEvents, JOB_TIMEOUT_MS)) as unknown as TapJobResult;
        } catch (jobError) {
            return res.status(400).json({ success: false, message: jobError instanceof Error ? jobError.message : String(jobError) });
        }

        if (result?.skipped && result.reason === 'already_tapped_in') {
            return res.status(409).json({ success: false, message: "Anda sudah melakukan tap in hari ini" });
        }

        return res.status(200).json({
            success: true,
            message: "Tap in berhasil",
            data: {
                siswa: {
                    nama: rfid.siswa.nama,
                    kelas: rfid.siswa.kelas
                },
                tap_in: formatTime(result.tapInTime),
                tap_out: formatTime(result.tapOutTime),
                status_tapin: result.statusTapIn
            }
        });

    } catch (error) {
        console.error("Error tap in:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Tap Out
export const tapOut = async (req: Request, res: Response) => {
    try {
        const { uid_rfid } = req.body;
        const { rfid, error } = await validateRfid(uid_rfid);
        if (error) return res.status(error.status).json({ success: false, message: error.message });

        const receivedAt = new Date().toISOString();

        const job = await addTapOutJob({
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

        let result: TapJobResult;
        try {
            result = (await job.waitUntilFinished(tapOutQueueEvents, JOB_TIMEOUT_MS)) as unknown as TapJobResult;
        } catch (jobError) {
            return res.status(400).json({ success: false, message: jobError instanceof Error ? jobError.message : String(jobError) });
        }

        if (result?.skipped && result.reason === 'already_tapped_out') {
            return res.status(409).json({ success: false, message: "Anda sudah melakukan tap out hari ini" });
        }

        return res.status(200).json({
            success: true,
            message: "Tap out berhasil",
            data: {
                siswa: {
                    nama: rfid.siswa.nama,
                    kelas: rfid.siswa.kelas
                },
                tap_in: formatTime(result.tapInTime),
                tap_out: formatTime(result.tapOutTime),
                status_tapin: null
            }
        });

    } catch (error) {
        console.error("Error tap out:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Get all absensi dengan pagination dan filter
export const getAllAbsensi = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const { tanggal, tanggal_mulai, tanggal_akhir, siswa_id, kelas_id, status_tapin } = req.query;

        const whereCondition: { deleted_at: null; tanggal?: Date | { gte: Date; lte: Date }; siswa_id?: string; siswa?: { kelas_id: number }; status_tapin?: string } = { deleted_at: null };

        if (tanggal) {
            whereCondition.tanggal = toDateOnly(tanggal as string);
        } else if (tanggal_mulai && tanggal_akhir) {
            whereCondition.tanggal = {
                gte: toDateOnly(tanggal_mulai as string),
                lte: toDateOnly(tanggal_akhir as string)
            };
        }

        if (siswa_id) whereCondition.siswa_id = siswa_id as string;

        if (kelas_id) {
            whereCondition.siswa = {
                kelas_id: parseInt(kelas_id as string)
            };
        }

        if (status_tapin) whereCondition.status_tapin = status_tapin as string;

        const [data, total] = await Promise.all([
            prisma.absensiSiswa.findMany({
                where: whereCondition as Prisma.AbsensiSiswaWhereInput,
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
            prisma.absensiSiswa.count({ where: whereCondition as Prisma.AbsensiSiswaWhereInput })
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
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Get absensi by ID
export const getAbsensiById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const absensiId = parseInt(Array.isArray(id) ? id[0] : id);

        const absensi = await prisma.absensiSiswa.findFirst({
            where: {
                id: absensiId,
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
                jam_mulai: formatJam(detail.jadwal.jam_mulai),
                jam_selesai: formatJam(detail.jadwal.jam_selesai),
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
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Get laporan range
export const getLaporanRange = async (req: Request, res: Response) => {
    try {
        const { tanggal_mulai, tanggal_akhir, kelas_id } = req.query;

        if (!tanggal_mulai || !tanggal_akhir) {
            return res.status(400).json({
                success: false,
                message: "tanggal_mulai dan tanggal_akhir harus diisi"
            });
        }

        const whereCondition: { deleted_at: null; tanggal: { gte: Date; lte: Date }; siswa?: { kelas_id: number } } = {
            deleted_at: null,
            tanggal: {
                gte: toDateOnly(tanggal_mulai as string),
                lte: toDateOnly(tanggal_akhir as string)
            }
        };

        if (kelas_id) {
            whereCondition.siswa = { kelas_id: parseInt(kelas_id as string) };
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
            } as Prisma.AbsensiSiswaWhereInput,
            select: { tanggal: true }
        });

        // Group by tanggal dalam WIB
        const grouped: Record<string, number> = {};
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
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Get laporan absensi harian
export const getLaporanHarian = async (req: Request, res: Response) => {
    try {
        const { tanggal, kelas_id, siswa_id } = req.query;

        if (!tanggal) {
            return res.status(400).json({
                success: false,
                message: "Tanggal harus terisi"
            });
        }

        const tanggalDate = toDateOnly(tanggal as string);

        const whereCondition: { tanggal: Date; deleted_at: null; siswa_id?: string; siswa?: { kelas_id: number } } = {
            tanggal: tanggalDate,
            deleted_at: null
        };

        if (siswa_id) {
            whereCondition.siswa_id = siswa_id as string;
        }

        if (kelas_id) {
            if (whereCondition.siswa_id) {
                // siswa_id already set — ignore kelas_id (more specific filter wins)
            } else {
                whereCondition.siswa = {
                    kelas_id: parseInt(kelas_id as string)
                };
            }
        }

        const absensiList = await prisma.absensiSiswa.findMany({
            where: whereCondition as Prisma.AbsensiSiswaWhereInput,
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
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Update absensi
export const updateAbsensi = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const absensiId = parseInt(Array.isArray(id) ? id[0] : id);
        const { tap_in, tap_out, status_tapin } = req.body;

        if (!id || isNaN(absensiId)) {
            return res.status(400).json({
                success: false,
                message: "ID tidak valid"
            });
        }

        const existingAbsensi = await prisma.absensiSiswa.findFirst({
            where: {
                id: absensiId,
                deleted_at: null
            }
        });

        if (!existingAbsensi) {
            return res.status(404).json({
                success: false,
                message: "Absensi tidak ditemukan"
            });
        }

        const updateData: { tap_in?: Date; tap_out?: Date; status_tapin?: string } = {};

        if (tap_in !== undefined) updateData.tap_in = new Date(tap_in as string);
        if (tap_out !== undefined) updateData.tap_out = new Date(tap_out as string);

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
            where: { id: absensiId },
            data: updateData as Prisma.AbsensiSiswaUpdateInput,
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
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Soft delete absensi
export const deleteAbsensi = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const absensiId = parseInt(Array.isArray(id) ? id[0] : id);

        if (!id || isNaN(absensiId)) {
            return res.status(400).json({
                success: false,
                message: "ID tidak valid"
            });
        }

        const existingAbsensi = await prisma.absensiSiswa.findFirst({
            where: {
                id: absensiId,
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
                absensi_id: absensiId,
                deleted_at: null
            },
            data: { deleted_at: new Date() }
        });

        await prisma.absensiSiswa.update({
            where: { id: absensiId },
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
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

export const getRekapSiswaSaya = async (req: Request, res: Response) => {
    try {
        const siswaId = req.user?.siswa_id;

        if (!siswaId) {
            return res.status(403).json({
                success: false,
                message: "Akun ini tidak terkait dengan data siswa"
            });
        }

        let { tanggal_mulai, tanggal_akhir, limit } = req.query;

        const whereCondition: { siswa_id: string; deleted_at: null; tanggal?: { gte: Date; lte: Date } } = {
            siswa_id: siswaId,
            deleted_at: null,
        };

        if (tanggal_mulai && tanggal_akhir) {
            whereCondition.tanggal = {
                gte: parseTanggal(tanggal_mulai as string),
                lte: parseTanggal(tanggal_akhir as string),
            };
        }

        const lim = limit ? parseInt(limit as string) : 20;

        const records = await prisma.finalAbsensi.findMany({
            where: whereCondition as Prisma.FinalAbsensiWhereInput,
            orderBy: { tanggal: "desc" },
            take: lim,
            select: {
                tanggal: true,
                status_final: true,
                total_hadir: true,
                total_izin: true,
                total_sakit: true,
                total_alpha: true,
                total_mapel: true,
                is_finalized: true,
                finalized_at: true,
            },
        });

        if (!records.length) {
            return res.status(404).json({
                success: false,
                message: "Belum ada data absensi yang tersedia"
            });
        }

        const dates = records.map((r) => r.tanggal);

        const absensiHarianList = await prisma.absensiSiswa.findMany({
            where: {
                siswa_id: siswaId,
                tanggal: { in: dates },
                deleted_at: null,
            },
            select: {
                tanggal: true,
                tap_in: true,
                tap_out: true,
                status_tapin: true,
            },
        });

        const absensiMap = new Map(
            absensiHarianList.map((a) => [a.tanggal.toISOString().slice(0, 10), a])
        );

        const statistik = hitungStatistikFinal(records);

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan rekap absensi pribadi",
            data: {
                statistik,
                riwayat: records.map((r) => {
                    const tglKey = r.tanggal.toISOString().slice(0, 10);
                    const absHarian = absensiMap.get(tglKey);
                    return {
                        tanggal: formatDate(r.tanggal),
                        status_final: r.status_final,
                        total_hadir: r.total_hadir,
                        total_izin: r.total_izin,
                        total_sakit: r.total_sakit,
                        total_alpha: r.total_alpha,
                        total_mapel: r.total_mapel,
                        is_finalized: r.is_finalized,
                        finalized_at: r.finalized_at ? formatDateTime(r.finalized_at) : null,
                        tap_in: absHarian?.tap_in ? absHarian.tap_in : null,
                        tap_out: absHarian?.tap_out ? absHarian.tap_out : null,
                        status_tapin: absHarian?.status_tapin ?? null,
                    };
                }),
            }
        });
    } catch (error) {
        console.error("getRekapSiswaSaya:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
