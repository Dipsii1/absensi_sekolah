import { Request, Response } from "express";
import { Prisma, StatusAbsensi, Hari } from "@prisma/client";
import prisma from "../config/prisma";
import {
    formatDate, formatTime, formatDateTime, formatJam,
    validateHari, getHariFromDate, parseTanggal, getTodayWIB, getWeekNumber, nowWibTimeString
} from "../helper/indexUtils";
import { simpanFinalAbsensi } from "../services/finalAbsensi";

const NAMA_BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const getActiveJadwalGuru = async (guru_id: number): Promise<Prisma.JadwalGetPayload<{
  include: {
    kelas: {
      include: {
        siswa: {
          where: Prisma.SiswaWhereInput
          select: Prisma.SiswaSelect
        }
      }
    }
  }
}> | null> => {
    const now = new Date();
    const hari = getHariFromDate(now) as Hari;
    const jamSekarang = nowWibTimeString();

    return prisma.jadwal.findFirst({
        where: {
            guru_id,
            hari,
            jam_mulai: { lte: jamSekarang },
            jam_selesai: { gte: jamSekarang },
        },
        include: {
            kelas: {
                include: {
                    siswa: {
                        where: { deleted_at: null }
                    }
                }
            }
        }
    });
};

const hitungStatistik = (detailArr: { status: string }[]) => {
    const total = detailArr.length;
    const Hadir = detailArr.filter((d) => d.status === "Hadir").length;
    const Izin = detailArr.filter((d) => d.status === "Izin").length;
    const Sakit = detailArr.filter((d) => d.status === "Sakit").length;
    const Alpha = detailArr.filter((d) => d.status === "Alpha").length;
    return {
        total_pertemuan: total,
        Hadir,
        Izin,
        Sakit,
        Alpha,
        persentase_keHadiran: total > 0 ? ((Hadir / total) * 100).toFixed(2) : "0.00"
    };
};

const groupPerBulan = (detailArr: { status: string }[], getTanggal: (d: { status: string }) => Date | string | null) => {
    return Array.from({ length: 12 }, (_, i) => {
        const detailBulan = detailArr.filter((d) => {
            const tgl = getTanggal(d);
            return tgl && new Date(tgl).getUTCMonth() === i;
        });
        const stat = hitungStatistik(detailBulan);
        return { bulan: i + 1, nama_bulan: NAMA_BULAN[i], ...stat };
    });
};

// Absensi by guru
export const absensiByGuru = async (req: Request, res: Response) => {
    try {
        const { guru_id, absensi_ids } = req.body;

        if (!guru_id) {
            return res.status(400).json({
                success: false,
                message: "guru_id wajib diisi"
            });
        }

        const jadwal = await getActiveJadwalGuru(parseInt(guru_id));

        if (!jadwal) {
            return res.status(404).json({
                success: false,
                message: "Tidak ada jadwal aktif untuk guru saat ini"
            });
        }

        const today = getTodayWIB();
        const siswaList = jadwal.kelas.siswa;

        const targetSiswaList = absensi_ids?.length
            ? siswaList.filter((s) => absensi_ids.includes(s.id))
            : siswaList;

        const siswaIds = targetSiswaList.map((s) => s.id);

        const absensiList = await prisma.absensiSiswa.findMany({
            where: {
                siswa_id: { in: siswaIds },
                tanggal: today,
                deleted_at: null,
                ...(absensi_ids?.length ? { id: { in: absensi_ids as unknown as number[] } } : {})
            },
            include: {
                detail: {
                    where: {
                        jadwal_id: jadwal.id,
                        deleted_at: null
                    }
                }
            }
        });

        const absensiMap = new Map(absensiList.map((a) => [a.siswa_id, a]));

        const toCreate: { absensi_id: number; jadwal_id: number; guru_id: number; status: StatusAbsensi; jam_absen: Date }[] = [];
        const results: { siswa_id: string; nama: string; status: string; tap_in?: string | null; status_tapin?: string | null; message?: string }[] = [];

        for (const siswa of targetSiswaList) {
            const absensi = absensiMap.get(siswa.id);

            if (!absensi) {
                results.push({
                    siswa_id: siswa.id,
                    nama: siswa.nama,
                    status: "Alpha",
                    message: "Belum tap in"
                });
                continue;
            }

            const existingDetail = absensi.detail[0] ?? null;

            if (existingDetail) {
                results.push({
                    siswa_id: siswa.id,
                    nama: siswa.nama,
                    status: existingDetail.status,
                    message: "Sudah diabsen"
                });
                continue;
            }

            const statusAbsensi = absensi.tap_in ? "Hadir" : "Alpha";
            toCreate.push({
                absensi_id: absensi.id,
                jadwal_id: jadwal.id,
                guru_id: parseInt(guru_id),
                status: statusAbsensi as StatusAbsensi,
                jam_absen: new Date()
            });

            results.push({
                siswa_id: siswa.id,
                nama: siswa.nama,
                status: statusAbsensi,
                tap_in: formatTime(absensi.tap_in),
                status_tapin: absensi.status_tapin
            });
        }

        if (toCreate.length > 0) {
            await prisma.$transaction(
                toCreate.map((data) => prisma.detailAbsensiSiswa.create({ data }))
            );
        }

        return res.json({
            success: true,
            message: "Absensi kelas berhasil",
            jadwal: {
                id: jadwal.id,
                kelas: jadwal.kelas.kelas,
                hari: jadwal.hari,
                jam: `${formatJam(jadwal.jam_mulai)} - ${formatJam(jadwal.jam_selesai)}`
            },
            data: results
        });

    } catch (error) {
        console.error("Error in absensiByGuru:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
};

// Update status absensi manual
export const updateStatusAbsensiManual = async (req: Request, res: Response) => {
    try {
        const { detail_absensi_id, status, keterangan } = req.body;

        if (!detail_absensi_id || !status) {
            return res.status(400).json({
                success: false,
                message: "detail_absensi_id dan status diperlukan"
            });
        }

        if (!Object.values(StatusAbsensi).includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status tidak valid. Gunakan: Hadir, Izin, Sakit, atau Alpha"
            });
        }

        const detailAbsensi = await prisma.detailAbsensiSiswa.findFirst({
            where: {
                id: parseInt(detail_absensi_id),
                deleted_at: null
            },
            include: {
                absensi: {
                    include: {
                        siswa: {
                            select: { nama: true }
                        }
                    }
                },
                jadwal: {
                    include: {
                        mata_pelajaran: true,
                        kelas: true
                    }
                }
            }
        });

        if (!detailAbsensi) {
            return res.status(404).json({
                success: false,
                message: "Detail absensi tidak ditemukan"
            });
        }

        const updated = await prisma.detailAbsensiSiswa.update({
            where: { id: parseInt(detail_absensi_id) },
            data: {
                status: status as StatusAbsensi,
                keterangan: keterangan ?? detailAbsensi.keterangan
            },
            include: {
                absensi: {
                    include: {
                        siswa: {
                            select: { id: true, nama: true, kelas_id: true }
                        }
                    }
                },
                jadwal: {
                    include: { mata_pelajaran: true }
                }
            }
        });

        if (detailAbsensi.jadwal_id === null) {
            await prisma.absensiSiswa.update({
                where: { id: detailAbsensi.absensi_id },
                data: { status_harian: status as StatusAbsensi }
            });
        }

        if (updated.absensi.siswa.kelas_id) {
            await simpanFinalAbsensi(updated.absensi.siswa.id, updated.absensi.siswa.kelas_id, updated.absensi.tanggal);
        }

        return res.status(200).json({
            success: true,
            message: "Berhasil mengupdate status absensi",
            data: {
                id: updated.id,
                siswa: updated.absensi.siswa,
                status: updated.status,
                status_lama: detailAbsensi.status,
                keterangan: updated.keterangan,
                jam_absen: formatDateTime(updated.jam_absen),
                jadwal: {
                    mata_pelajaran: updated.jadwal.mata_pelajaran.nama_mapel,
                    hari: updated.jadwal.hari,
                    tanggal: formatDate(updated.absensi.tanggal)
                }
            }
        });

    } catch (error) {
        console.error("Error in updateStatusAbsensiManual:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Absensi manual walas
export const absensiManualWalas = async (req: Request, res: Response) => {
    try {
        const { walas_id, kelas_id, tanggal, data_absensi } = req.body;

        if (!walas_id || !kelas_id || !tanggal || !data_absensi?.length) {
            return res.status(400).json({
                success: false,
                message: "walas_id, kelas_id, tanggal, dan data_absensi wajib diisi"
            });
        }

        const statusTidakValid = data_absensi.find((d) => !Object.values(StatusAbsensi).includes(d.status));
        if (statusTidakValid) {
            return res.status(400).json({
                success: false,
                message: `Status tidak valid untuk siswa_id ${statusTidakValid.siswa_id}. Gunakan: Hadir, Izin, Sakit, atau Alpha`
            });
        }

        const kelas = await prisma.kelas.findFirst({
            where: {
                id: parseInt(kelas_id),
                walas_id: parseInt(walas_id),
                deleted_at: null
            }
        });

        if (!kelas) {
            return res.status(404).json({
                success: false,
                message: "Kelas tidak ditemukan atau Anda bukan walas kelas ini"
            });
        }

        const targetDate = parseTanggal(tanggal);
        const siswaIds = data_absensi.map((d) => d.siswa_id);

        const absensiList = await prisma.absensiSiswa.findMany({
            where: {
                siswa_id: { in: siswaIds },
                tanggal: targetDate,
                deleted_at: null
            },
            include: {
                detail: {
                    where: {
                        jadwal_id: null,
                        guru_id: parseInt(walas_id),
                        deleted_at: null
                    }
                }
            }
        });

        const absensiMap = new Map(absensiList.map((a) => [a.siswa_id, a]));

        const siswaTanpaAbsensi = siswaIds.filter((id) => !absensiMap.has(id));

        if (siswaTanpaAbsensi.length > 0) {
            await prisma.$transaction(
                siswaTanpaAbsensi.map((siswa_id) => {
                    const matchedItem = data_absensi.find((d) => d.siswa_id === siswa_id);
                    return prisma.absensiSiswa.create({
                        data: {
                            siswa_id,
                            tanggal: targetDate,
                            tap_in: null,
                            tap_out: null,
                            status_tapin: null,
                            rfid_id: null,
                            status_harian: (matchedItem?.status as StatusAbsensi) ?? null
                        }
                    });
                })
            );

            const newAbsensi = await prisma.absensiSiswa.findMany({
                where: {
                    siswa_id: { in: siswaTanpaAbsensi },
                    tanggal: targetDate
                },
                include: {
                    detail: {
                        where: {
                            jadwal_id: null,
                            guru_id: parseInt(walas_id),
                            deleted_at: null
                        }
                    }
                }
            });
            newAbsensi.forEach((a) => absensiMap.set(a.siswa_id, a));
        }

        const results: { siswa_id: string; status: string; keterangan: string | null; aksi: string }[] = [];
        const toCreate: { absensi_id: number; jadwal_id: null; guru_id: number; status: StatusAbsensi; keterangan: string | null; jam_absen: Date }[] = [];
        const toUpdate: { id: number; status: StatusAbsensi; keterangan: string | null }[] = [];

        for (const item of data_absensi) {
            const absensi = absensiMap.get(item.siswa_id);
            const existingDetail = absensi?.detail?.[0] ?? null;

            if (existingDetail) {
                toUpdate.push({
                    id: existingDetail.id,
                    status: item.status as StatusAbsensi,
                    keterangan: item.keterangan ?? null
                });
                results.push({
                    siswa_id: item.siswa_id,
                    status: item.status,
                    keterangan: item.keterangan ?? null,
                    aksi: "diperbarui"
                });
            } else {
                toCreate.push({
                    absensi_id: absensi.id,
                    jadwal_id: null,
                    guru_id: parseInt(walas_id),
                    status: item.status as StatusAbsensi,
                    keterangan: item.keterangan ?? null,
                    jam_absen: new Date()
                });
                results.push({
                    siswa_id: item.siswa_id,
                    status: item.status,
                    keterangan: item.keterangan ?? null,
                    aksi: "dibuat"
                });
            }
        }

        await prisma.$transaction([
            ...toCreate.map((data) => prisma.detailAbsensiSiswa.create({ data })),
            ...toUpdate.map(({ id, status, keterangan }) =>
                prisma.detailAbsensiSiswa.update({
                    where: { id },
                    data: { status, keterangan }
                })
            ),
            ...data_absensi.map((item) =>
                prisma.absensiSiswa.updateMany({
                    where: {
                        siswa_id: item.siswa_id,
                        tanggal: targetDate,
                        deleted_at: null
                    },
                    data: {
                        status_harian: item.status as StatusAbsensi
                    }
                })
            )
        ]);

        return res.status(200).json({
            success: true,
            message: "Absensi manual berhasil disimpan",
            data: {
                total: results.length,
                dibuat: results.filter((r) => r.aksi === "dibuat").length,
                diperbarui: results.filter((r) => r.aksi === "diperbarui").length,
                tanggal: formatDate(targetDate),
                detail: results
            }
        });

    } catch (error) {
        console.error("Error in absensiManualWalas:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Delete detail absensi (soft delete)
export const deleteDetailAbsensi = async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        const detailAbsensi = await prisma.detailAbsensiSiswa.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            },
            include: {
                absensi: {
                    include: {
                        siswa: {
                            select: { nama: true }
                        }
                    }
                },
                jadwal: {
                    include: { mata_pelajaran: true }
                }
            }
        });

        if (!detailAbsensi) {
            return res.status(404).json({
                success: false,
                message: "Detail absensi tidak ditemukan"
            });
        }

        await prisma.detailAbsensiSiswa.update({
            where: { id: parseInt(id) },
            data: { deleted_at: new Date() }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil menghapus detail absensi",
            data: {
                id: detailAbsensi.id,
                siswa: detailAbsensi.absensi.siswa.nama,
                mata_pelajaran: detailAbsensi.jadwal?.mata_pelajaran?.nama_mapel ?? "-",
                tanggal: formatDate(detailAbsensi.absensi.tanggal)
            }
        });

    } catch (error) {
        console.error("Error in deleteDetailAbsensi:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Pratinjau walas
export const pratinjauWalas = async (req: Request, res: Response) => {
    try {
        const { kelas_id, tanggal } = req.query;

        if (!kelas_id || !tanggal) {
            return res.status(400).json({
                success: false,
                message: "kelas_id dan tanggal wajib diisi"
            });
        }

        const targetDate = parseTanggal(tanggal as string);

        const kelas = await prisma.kelas.findFirst({
            where: {
                id: parseInt(kelas_id as string),
                deleted_at: null
            },
            include: {
                tahun: true,
                siswa: {
                    where: { deleted_at: null },
                    select: {
                        id: true,
                        nama: true,
                        nisn: true,
                        orang_tua: {
                            select: { nomor_telepon: true }
                        },
                        rfid: {
                            where: {
                                is_active: true,
                                deleted_at: null
                            },
                            select: { uid_rfid: true }
                        }
                    }
                }
            }
        });

        if (!kelas) {
            return res.status(404).json({
                success: false,
                message: "Kelas tidak ditemukan"
            });
        }

        const walasId = kelas.walas_id ?? null;

        const absensiHariIni = await prisma.absensiSiswa.findMany({
            where: {
                tanggal: targetDate,
                deleted_at: null,
                siswa: { kelas_id: parseInt(kelas_id as string) }
            },
            include: {
                detail: {
                    where: {
                        deleted_at: null,
                        jadwal_id: null,
                        ...(walasId ? { guru_id: walasId } : {})
                    },
                    select: {
                        id: true,
                        status: true,
                        keterangan: true,
                        jadwal_id: true,
                        guru_id: true
                    }
                }
            }
        });

        const absensiMap = new Map(absensiHariIni.map((a) => [a.siswa_id, a]));

        const daftarSiswa = kelas.siswa.map((siswa) => {
            const punya_rfid = siswa.rfid.length > 0;
            const absensi = absensiMap.get(siswa.id);
            const sudah_tap = !!absensi?.tap_in;

            const detailWalas = absensi?.detail?.[0] ?? null;

            let status_rekomendasi = "Alpha";
            if (detailWalas) status_rekomendasi = detailWalas.status;
            else if (sudah_tap) status_rekomendasi = "Hadir";

            return {
                siswa_id: siswa.id,
                nama: siswa.nama,
                nisn: siswa.nisn ?? null,
                nomor_telepon: siswa.orang_tua?.nomor_telepon ?? null,
                punya_rfid,
                tap_in: absensi ? formatTime(absensi.tap_in) : null,
                tap_out: absensi ? formatTime(absensi.tap_out) : null,
                status_tapin: absensi?.status_tapin ?? null,
                sudah_diabsen: !!detailWalas,
                status_saat_ini: detailWalas?.status ?? null,
                keterangan: detailWalas?.keterangan ?? null,
                detail_id: detailWalas?.id ?? null,
                status_rekomendasi,
                kategori: !punya_rfid ? "tanpa_rfid" : !sudah_tap ? "belum_tap" : "sudah_tap"
            };
        });

        const summary = {
            total: daftarSiswa.length,
            punya_rfid: daftarSiswa.filter((s) => s.punya_rfid).length,
            tanpa_rfid: daftarSiswa.filter((s) => !s.punya_rfid).length,
            sudah_tap: daftarSiswa.filter((s) => s.tap_in).length,
            belum_tap: daftarSiswa.filter((s) => !s.tap_in).length,
            sudah_diabsen: daftarSiswa.filter((s) => s.sudah_diabsen).length
        };

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar siswa untuk absensi walas",
            data: {
                kelas: {
                    id: kelas.id,
                    nama: `${kelas.kelas} ${kelas.jurusan}`,
                    tahun_ajaran: kelas.tahun.tahun_ajaran
                },
                tanggal: formatDate(targetDate),
                hari: getHariFromDate(targetDate),
                summary,
                daftar_siswa: daftarSiswa
            }
        });

    } catch (error) {
        console.error("Error in pratinjauWalas:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
};
