import { Request, Response } from "express";
import { Prisma, StatusAbsensi, StatusSiswa } from "@prisma/client";
import prisma from "../config/prisma";
import {
    parseTanggal, formatDate, formatDateTime
} from "../helper/indexUtils";
import {
    simpanFinalAbsensi,
    finalisasiAbsensiKelas,
    finalisasiSemuaKelasAktif
} from "../services/finalAbsensi";

const buildDateWhere = ({ tanggal, tanggal_mulai, tanggal_akhir }: { tanggal?: string; tanggal_mulai?: string; tanggal_akhir?: string }) => {
    if (tanggal) return { equals: parseTanggal(tanggal) };

    const dateWhere: { gte?: Date; lte?: Date } = {};
    if (tanggal_mulai) dateWhere.gte = parseTanggal(tanggal_mulai);
    if (tanggal_akhir) dateWhere.lte = parseTanggal(tanggal_akhir);
    return Object.keys(dateWhere).length ? dateWhere : undefined;
};

const formatFinalAbsensiRow = (siswa: { id: string; nama: string; nisn: string; nipd: string | null; nik: string | null; jenis_kelamin: string | null; kelas_id: number | null; kelas: { id: number; kelas: string; jurusan: string; tahun_ajaran_id: number; tahun: { id: number; tahun_ajaran: string; is_active?: boolean } } | null }, record: { tanggal: Date; status_final: string; total_hadir: number; total_izin: number; total_sakit: number; total_alpha: number; total_mapel: number; is_finalized: boolean; finalized_at: Date | null } | null, fallbackTanggal: string | null = null) => ({
    siswa_id: siswa.id,
    nama: siswa.nama,
    nisn: siswa.nisn,
    nipd: siswa.nipd,
    nik: siswa.nik,
    jenis_kelamin: siswa.jenis_kelamin,
    kelas_id: siswa.kelas?.id ?? null,
    kelas: siswa.kelas
        ? {
            id: siswa.kelas.id,
            kelas: siswa.kelas.kelas,
            jurusan: siswa.kelas.jurusan,
            tahun_ajaran_id: siswa.kelas.tahun_ajaran_id,
            tahun: siswa.kelas.tahun,
        }
        : null,
    tanggal: record?.tanggal ? record.tanggal.toISOString().slice(0, 10) : fallbackTanggal,
    status_final: record?.status_final ?? null,
    total_hadir: record?.total_hadir ?? 0,
    total_izin: record?.total_izin ?? 0,
    total_sakit: record?.total_sakit ?? 0,
    total_alpha: record?.total_alpha ?? 0,
    total_mapel: record?.total_mapel ?? 0,
    is_finalized: record?.is_finalized ?? false,
    finalized_at: record?.finalized_at ? formatDateTime(record.finalized_at) : null,
});

const buildSiswaWhere = ({ kelas_id, jurusan, tahun_ajaran_id, search }: { kelas_id?: string; jurusan?: string; tahun_ajaran_id?: string; search?: string }) => {
    const siswaWhere: Prisma.SiswaWhereInput = { deleted_at: null };

    if (kelas_id) siswaWhere.kelas_id = parseInt(kelas_id);

    const kelasWhere: { jurusan?: string; tahun_ajaran_id?: number; deleted_at: null } = { deleted_at: null };
    if (jurusan) kelasWhere.jurusan = jurusan;
    if (tahun_ajaran_id) kelasWhere.tahun_ajaran_id = parseInt(tahun_ajaran_id);
    if (Object.keys(kelasWhere).length) {
        siswaWhere.kelas = {
            ...kelasWhere,
            deleted_at: null
        };
    }

    if (search) {
        siswaWhere.OR = [
            { nama: { contains: search, mode: "insensitive" } },
            { nisn: { contains: search, mode: "insensitive" } },
            { nipd: { contains: search, mode: "insensitive" } },
            { nik: { contains: search, mode: "insensitive" } },
        ];
    }

    return siswaWhere;
};

export const getFinalAbsensiFilters = async (req: Request, res: Response) => {
    try {
        const [kelasList, tahunList] = await Promise.all([
            prisma.kelas.findMany({
                where: { deleted_at: null },
                orderBy: [
                    { tahun_ajaran_id: "desc" },
                    { kelas: "asc" },
                    { jurusan: "asc" }
                ],
                select: {
                    id: true,
                    kelas: true,
                    jurusan: true,
                    tahun_ajaran_id: true,
                    tahun: {
                        select: {
                            id: true,
                            tahun_ajaran: true,
                            is_active: true
                        }
                    }
                }
            }),
            prisma.tahun.findMany({
                where: { deleted_at: null },
                orderBy: [{ is_active: "desc" }, { created_at: "desc" }],
                select: {
                    id: true,
                    tahun_ajaran: true,
                    tanggal_mulai: true,
                    tanggal_selesai: true,
                    is_active: true
                }
            })
        ]);

        const jurusan = Array.from(
            new Set(kelasList.map((item) => item.jurusan).filter(Boolean))
        ).sort();

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan filter final absensi",
            data: {
                kelas: kelasList,
                tahun_ajaran: tahunList,
                jurusan,
            }
        });
    } catch (error) {
        console.error("[Controller] getFinalAbsensiFilters:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

const generateDatesRange = (startStr: string, endStr: string) => {
    const dates: Date[] = [];
    const current = parseTanggal(startStr);
    const end = parseTanggal(endStr);
    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

const autoFinalizeIfNeeded = async (dates: Date[]) => {
    if (!dates.length) return;

    const existingDates = await prisma.finalAbsensi.groupBy({
        by: ["tanggal"],
        where: {
            tanggal: { in: dates },
            deleted_at: null
        }
    });
    const existingSet = new Set(existingDates.map((d) => d.tanggal.toISOString()));

    const datesWithAbsensi = await prisma.absensiSiswa.groupBy({
        by: ["tanggal"],
        where: {
            tanggal: { in: dates },
            deleted_at: null
        }
    });
    const absensiSet = new Set(datesWithAbsensi.map((d) => d.tanggal.toISOString()));

    for (const date of dates) {
        const dateKey = date.toISOString();
        if (!existingSet.has(dateKey) && absensiSet.has(dateKey)) {
            console.log(`[Auto-Finalize] No finalAbsensi for ${dateKey.slice(0, 10)}, running finalization...`);
            try {
                await finalisasiSemuaKelasAktif(date);
            } catch (err) {
                console.error(`[Auto-Finalize] Failed for ${dateKey.slice(0, 10)}:`, err instanceof Error ? err.message : String(err));
            }
        }
    }
};

export const getAllFinalAbsensi = async (req: Request, res: Response) => {
    try {
        const {
            tanggal,
            tanggal_mulai,
            tanggal_akhir,
            kelas_id,
            jurusan,
            tahun_ajaran_id,
            search,
            include_empty
        } = req.query;

        const page = Math.max(parseInt(req.query.page as string) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5000, 1), 10000);
        const skip = (page - 1) * limit;
        const dateWhere = buildDateWhere({ tanggal: String(tanggal), tanggal_mulai: String(tanggal_mulai), tanggal_akhir: String(tanggal_akhir) });

        const siswaWhere = buildSiswaWhere({ kelas_id: String(kelas_id), jurusan: String(jurusan), tahun_ajaran_id: String(tahun_ajaran_id), search: String(search) });
        const includeEmptyRows = include_empty !== "false";

        if (dateWhere) {
            if (tanggal) {
                await autoFinalizeIfNeeded([parseTanggal(String(tanggal))]);
            } else if (tanggal_mulai && tanggal_akhir) {
                const dates = generateDatesRange(String(tanggal_mulai), String(tanggal_akhir));
                await autoFinalizeIfNeeded(dates.slice(0, 31));
            }
        }

        if (!includeEmptyRows) {
            const finalAbsensiWhere: { deleted_at: null; tanggal?: { gte?: Date; lte?: Date; equals?: Date }; kelas_id?: number; siswa: typeof siswaWhere } = {
                deleted_at: null,
                ...(dateWhere ? { tanggal: dateWhere } : {}),
                ...(kelas_id ? { kelas_id: parseInt(kelas_id as string) } : {}),
                siswa: siswaWhere
            };

            const [records, totalRecords] = await Promise.all([
                prisma.finalAbsensi.findMany({
                    where: finalAbsensiWhere as Prisma.FinalAbsensiWhereInput,
                    skip,
                    take: limit,
                    orderBy: [{ tanggal: "asc" }, { kelas_id: "asc" }, { siswa: { nama: "asc" } }],
                    include: {
                        siswa: {
                            include: {
                                kelas: {
                                    select: {
                                        id: true,
                                        kelas: true,
                                        jurusan: true,
                                        tahun_ajaran_id: true,
                                        tahun: {
                                            select: {
                                                id: true,
                                                tahun_ajaran: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.finalAbsensi.count({ where: finalAbsensiWhere as Prisma.FinalAbsensiWhereInput })
            ]);

            return res.status(200).json({
                success: true,
                message: "Berhasil mendapatkan data final absensi",
                data: records.map((record) => formatFinalAbsensiRow(record.siswa, record, null)),
                pagination: {
                    total: totalRecords,
                    page,
                    limit,
                    totalPages: Math.ceil(totalRecords / limit)
                }
            });
        }

        const [siswas, totalSiswa] = await Promise.all([
            prisma.siswa.findMany({
                where:                     siswaWhere as Prisma.SiswaWhereInput,
                skip,
                take: limit,
                orderBy: [{ kelas_id: "asc" }, { nama: "asc" }],
                include: {
                    kelas: {
                        select: {
                            id: true,
                            kelas: true,
                            jurusan: true,
                            tahun_ajaran_id: true,
                            tahun: {
                                select: {
                                    id: true,
                                    tahun_ajaran: true,
                                    is_active: true
                                }
                            }
                        }
                    },
                    final_absensi: {
                        where: {
                            deleted_at: null,
                            ...(dateWhere ? { tanggal: dateWhere } : {}),
                            ...(kelas_id ? { kelas_id: parseInt(kelas_id as string) } : {})
                        },
                        orderBy: { tanggal: "asc" }
                    }
                }
            }),
            prisma.siswa.count({ where: siswaWhere as Prisma.SiswaWhereInput })
        ]);

        const fallbackTanggal = String(tanggal) || null;
        const rows = siswas.flatMap((siswa) => {
            if (siswa.final_absensi.length === 0) {
                return [formatFinalAbsensiRow(siswa, null, fallbackTanggal)];
            }
            return siswa.final_absensi.map((record) => formatFinalAbsensiRow(siswa, record, fallbackTanggal));
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data final absensi",
            data: rows,
            pagination: {
                total: totalSiswa,
                page,
                limit,
                totalPages: Math.ceil(totalSiswa / limit)
            }
        });
    } catch (error) {
        console.error("[Controller] getAllFinalAbsensi:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

export const finalisasiSiswa = async (req: Request, res: Response) => {
    try {
        const { siswa_id, kelas_id, tanggal } = req.body;

        if (!siswa_id || !kelas_id || !tanggal) {
            return res.status(400).json({
                success: false,
                message: "siswa_id, kelas_id, dan tanggal wajib diisi"
            });
        }

        const record = await simpanFinalAbsensi(
            siswa_id,
            parseInt(kelas_id),
            parseTanggal(String(tanggal))
        );

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Tidak ada data absensi untuk siswa pada tanggal tersebut"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Final absensi siswa berhasil diproses",
            data: {
                siswa_id: record.siswa_id,
                tanggal: formatDate(record.tanggal),
                status_final: record.status_final,
                total_hadir: record.total_hadir,
                total_izin: record.total_izin,
                total_sakit: record.total_sakit,
                total_alpha: record.total_alpha,
                total_mapel: record.total_mapel,
                finalized_at: formatDateTime(record.finalized_at)
            }
        });
    } catch (error) {
        console.error("[Controller] finalisasiSiswa:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

export const finalisasiKelas = async (req: Request, res: Response) => {
    try {
        const kelas_id = parseInt(Array.isArray(req.params.kelas_id) ? req.params.kelas_id[0] : req.params.kelas_id);
        const { tanggal } = req.body;

        if (isNaN(kelas_id)) {
            return res.status(400).json({ success: false, message: "kelas_id tidak valid" });
        }

        if (!tanggal) {
            return res.status(400).json({ success: false, message: "tanggal wajib diisi" });
        }

        const hasil = await finalisasiAbsensiKelas(kelas_id, parseTanggal(String(tanggal)));

        return res.status(200).json({
            success: true,
            message: "Finalisasi kelas selesai",
            data: {
                tanggal: formatDate(parseTanggal(String(tanggal))),
                ...hasil
            }
        });
    } catch (error) {
        console.error("[Controller] finalisasiKelas:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

export const finalisasiSemuaKelas = async (req: Request, res: Response) => {
    try {
        const { tanggal } = req.body;

        if (!tanggal) {
            return res.status(400).json({ success: false, message: "tanggal wajib diisi" });
        }

        const hasil = await finalisasiSemuaKelasAktif(parseTanggal(String(tanggal)));

        return res.status(200).json({
            success: true,
            message: "Finalisasi semua kelas aktif selesai",
            data: {
                tanggal: formatDate(parseTanggal(String(tanggal))),
                total_kelas: hasil.length,
                rekap_kelas: hasil
            }
        });
    } catch (error) {
        console.error("[Controller] finalisasiSemuaKelas:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

export const finalisasiSemuaSiswa = async (req: Request, res: Response) => {
    try {
        const { tanggal } = req.body;

        if (!tanggal) {
            return res.status(400).json({ success: false, message: "tanggal wajib diisi" });
        }

        const tanggalParsed = parseTanggal(String(tanggal));

        const siswaList = await prisma.siswa.findMany({
            where: {
                status_siswa: StatusSiswa.Active,
                deleted_at: null,
                kelas_id: { not: null }
            },
            select: {
                id: true,
                kelas_id: true
            }
        });

        if (siswaList.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Tidak ada siswa aktif ditemukan",
                data: {
                    tanggal: formatDate(tanggalParsed),
                    total_siswa: 0,
                    berhasil: 0,
                    gagal: 0,
                    detail_gagal: []
                }
            });
        }

        let berhasil = 0;
        let gagal = 0;
        const detailGagal: { siswa_id: string; alasan: string }[] = [];

        for (const siswa of siswaList) {
            try {
                const record = await simpanFinalAbsensi(
                    siswa.id,
                    siswa.kelas_id as number,
                    tanggalParsed
                );

                if (record) {
                    berhasil++;
                } else {
                    gagal++;
                    detailGagal.push({
                        siswa_id: siswa.id,
                        alasan: "Gagal memproses final absensi"
                    });
                }
            } catch (err) {
                gagal++;
                detailGagal.push({
                    siswa_id: siswa.id,
                    alasan: err instanceof Error ? err.message : String(err)
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Finalisasi seluruh siswa selesai",
            data: {
                tanggal: formatDate(tanggalParsed),
                total_siswa: siswaList.length,
                berhasil,
                gagal,
                detail_gagal: detailGagal
            }
        });
    } catch (error) {
        console.error("[Controller] finalisasiSemuaSiswa:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
