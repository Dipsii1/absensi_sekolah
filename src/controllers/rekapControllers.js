const prisma = require("../config/prisma");
const {
    parseTanggal, formatDate, formatDateTime,
    getHariFromDate, getWeekNumber
} = require("../helper/indexUtils");
const { hitungStatistikFinal } = require("../helper/helperFinalAbsensi");
const NAMA_BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]


// rekap siswa (tanggal bebas pilih)
const getRekapAbsensiSiswa = async (req, res) => {
    try {
        const { siswa_id, tanggal_mulai, tanggal_akhir } = req.query;

        if (!siswa_id) {
            return res.status(400).json({ success: false, message: "siswa_id diperlukan" });
        }

        const records = await prisma.finalAbsensi.findMany({
            where: {
                siswa_id,
                deleted_at: null,
                tanggal: {
                    gte: tanggal_mulai ? parseTanggal(tanggal_mulai) : undefined,
                    lte: tanggal_akhir ? parseTanggal(tanggal_akhir) : undefined
                }
            },
            include: {
                siswa: {
                    select: {
                        id: true, nama: true,
                        kelas: { include: { tahun: true } }
                    }
                }
            },
            orderBy: { tanggal: "desc" }
        });

        if (!records.length) {
            return res.status(404).json({ success: false, message: "Data absensi tidak ditemukan" });
        }

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan rekap absensi siswa",
            data: {
                siswa: records[0].siswa,
                periode: {
                    tanggal_mulai: tanggal_mulai || "Awal",
                    tanggal_akhir: tanggal_akhir || "Sekarang"
                },
                statistik: hitungStatistikFinal(records),
                riwayat: records.map((r) => ({
                    tanggal: formatDate(r.tanggal),
                    status_final: r.status_final,
                    total_hadir: r.total_hadir,
                    total_izin: r.total_izin,
                    total_sakit: r.total_sakit,
                    total_alpha: r.total_alpha,
                    total_mapel: r.total_mapel,
                    finalized_at: formatDateTime(r.finalized_at)
                }))
            }
        });
    } catch (error) {
        console.error("getRekapAbsensiSiswa:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};


// rekap siswa mingguan 
const getRekapAbsensiSiswaWeekly = async (req, res) => {
    try {
        const { siswa_id, tanggal_mulai } = req.query;

        if (!siswa_id || !tanggal_mulai) {
            return res.status(400).json({ success: false, message: "siswa_id dan tanggal_mulai diperlukan" });
        }

        const startDate = parseTanggal(tanggal_mulai);
        const dow = startDate.getDay();
        const diffMon = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(startDate);
        monday.setDate(monday.getDate() + diffMon);
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);

        const monStr = monday.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
        const sunStr = sunday.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
        const tglMulai = parseTanggal(monStr);
        const tglAkhir = new Date(`${sunStr}T23:59:59.999+07:00`);

        const records = await prisma.finalAbsensi.findMany({
            where: {
                siswa_id,
                deleted_at: null,
                tanggal: { gte: tglMulai, lte: tglAkhir }
            },
            include: {
                siswa: {
                    select: {
                        id: true, nama: true,
                        kelas: { include: { tahun: true } }
                    }
                }
            },
            orderBy: { tanggal: "asc" }
        });

        if (!records.length) {
            return res.status(404).json({ success: false, message: "Data absensi tidak ditemukan untuk minggu tersebut" });
        }

        const HARI_URUTAN = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

        const statistikPerHari = HARI_URUTAN.map((hari) => {
            const rec = records.filter((r) => getHariFromDate(new Date(r.tanggal)) === hari);
            return {
                hari,
                ...hitungStatistikFinal(rec),
                detail: rec.map((r) => ({
                    tanggal: formatDate(r.tanggal),
                    status_final: r.status_final,
                    total_mapel: r.total_mapel
                }))
            };
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan rekap absensi mingguan",
            data: {
                siswa: records[0].siswa,
                periode: {
                    tanggal_mulai: formatDate(tglMulai),
                    tanggal_akhir: formatDate(tglAkhir),
                    minggu_ke: getWeekNumber(tglMulai)
                },
                statistik_keseluruhan: hitungStatistikFinal(records),
                statistik_per_hari: statistikPerHari
            }
        });
    } catch (error) {
        console.error("getRekapAbsensiSiswaWeekly:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};

// rekap siswa bulanan 
const getRekapAbsensiSiswaMonthly = async (req, res) => {
    try {
        const { siswa_id, bulan, tahun } = req.query;

        if (!siswa_id || !bulan || !tahun) {
            return res.status(400).json({ success: false, message: "siswa_id, bulan, dan tahun diperlukan" });
        }

        const bulanInt = parseInt(bulan);
        const tahunInt = parseInt(tahun);
        const tglMulai = new Date(Date.UTC(tahunInt, bulanInt - 1, 1));
        const tglAkhir = new Date(Date.UTC(tahunInt, bulanInt, 0));

        const records = await prisma.finalAbsensi.findMany({
            where: {
                siswa_id,
                deleted_at: null,
                tanggal: { gte: tglMulai, lte: tglAkhir }
            },
            include: {
                siswa: {
                    select: {
                        id: true, nama: true,
                        kelas: { include: { tahun: true } }
                    }
                }
            },
            orderBy: { tanggal: "asc" }
        });

        if (!records.length) {
            return res.status(404).json({ success: false, message: "Data absensi tidak ditemukan untuk bulan tersebut" });
        }

        // Statistik per minggu
        const statistikPerMinggu = [];
        let mingguKe = 1;
        let current = new Date(tglMulai);
        while (current <= tglAkhir) {
            const endOfWeek = new Date(current);
            endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
            const akhirMinggu = endOfWeek > tglAkhir ? tglAkhir : endOfWeek;
            const recMinggu = records.filter((r) => {
                const t = new Date(r.tanggal);
                return t >= current && t <= akhirMinggu;
            });
            statistikPerMinggu.push({
                minggu_ke: mingguKe,
                tanggal_mulai: formatDate(current),
                tanggal_akhir: formatDate(akhirMinggu),
                ...hitungStatistikFinal(recMinggu)
            });
            current = new Date(akhirMinggu);
            current.setDate(current.getDate() + 1);
            mingguKe++;
        }

        return res.status(200).json({
            success: true,
            message: `Berhasil mendapatkan rekap absensi bulan ${NAMA_BULAN[bulanInt - 1]} ${tahunInt}`,
            data: {
                siswa: records[0].siswa,
                periode: {
                    bulan: bulanInt,
                    nama_bulan: NAMA_BULAN[bulanInt - 1],
                    tahun: tahunInt,
                    tanggal_mulai: formatDate(tglMulai),
                    tanggal_akhir: formatDate(tglAkhir)
                },
                statistik_keseluruhan: hitungStatistikFinal(records),
                statistik_per_minggu: statistikPerMinggu,
                riwayat: records.map((r) => ({
                    tanggal: formatDate(r.tanggal),
                    status_final: r.status_final,
                    total_hadir: r.total_hadir,
                    total_izin: r.total_izin,
                    total_sakit: r.total_sakit,
                    total_alpha: r.total_alpha,
                    total_mapel: r.total_mapel
                }))
            }
        });
    } catch (error) {
        console.error("getRekapAbsensiSiswaMonthly:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};

// rekap siswa tahunan 
const getRekapAbsensiSiswaYearly = async (req, res) => {
    try {
        const { siswa_id, tahun } = req.query;

        if (!siswa_id || !tahun) {
            return res.status(400).json({ success: false, message: "siswa_id dan tahun diperlukan" });
        }

        const tahunInt = parseInt(tahun);
        const tglMulai = new Date(Date.UTC(tahunInt, 0, 1));
        const tglAkhir = new Date(Date.UTC(tahunInt, 11, 31));

        const records = await prisma.finalAbsensi.findMany({
            where: {
                siswa_id,
                deleted_at: null,
                tanggal: { gte: tglMulai, lte: tglAkhir }
            },
            include: {
                siswa: {
                    select: {
                        id: true, nama: true,
                        kelas: { include: { tahun: true } }
                    }
                }
            },
            orderBy: { tanggal: "asc" }
        });

        if (!records.length) {
            return res.status(404).json({ success: false, message: "Data absensi tidak ditemukan untuk tahun tersebut" });
        }

        const perBulan = Array.from({ length: 12 }, (_, i) => {
            const rec = records.filter((r) => new Date(r.tanggal).getUTCMonth() === i);
            return { bulan: i + 1, nama_bulan: NAMA_BULAN[i], ...hitungStatistikFinal(rec) };
        });

        const sem1 = records.filter((r) => {
            const b = new Date(r.tanggal).getUTCMonth() + 1;
            return b >= 1 && b <= 6;
        });
        const sem2 = records.filter((r) => {
            const b = new Date(r.tanggal).getUTCMonth() + 1;
            return b >= 7 && b <= 12;
        });

        return res.status(200).json({
            success: true,
            message: `Berhasil mendapatkan rekap absensi tahunan ${tahunInt}`,
            data: {
                siswa: records[0].siswa,
                tahun: tahunInt,
                periode: {
                    tanggal_mulai: formatDate(tglMulai),
                    tanggal_akhir: formatDate(tglAkhir)
                },
                statistik_keseluruhan: hitungStatistikFinal(records),
                statistik_per_semester: [
                    { semester: "Semester 1 (Jan–Jun)", ...hitungStatistikFinal(sem1) },
                    { semester: "Semester 2 (Jul–Des)", ...hitungStatistikFinal(sem2) }
                ],
                statistik_per_bulan: perBulan,
                riwayat: records.map((r) => ({
                    tanggal: formatDate(r.tanggal),
                    status_final: r.status_final,
                    total_hadir: r.total_hadir,
                    total_izin: r.total_izin,
                    total_sakit: r.total_sakit,
                    total_alpha: r.total_alpha,
                    total_mapel: r.total_mapel
                }))
            }
        });
    } catch (error) {
        console.error("getRekapAbsensiSiswaYearly:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};

// rekap kelas harian 

const getRekapAbsensiKelas = async (req, res) => {
    try {
        const { kelas_id, tanggal } = req.query;

        if (!kelas_id || !tanggal) {
            return res.status(400).json({ success: false, message: "kelas_id dan tanggal wajib diisi" });
        }

        const targetDate = parseTanggal(tanggal);

        const kelas = await prisma.kelas.findFirst({
            where: { id: parseInt(kelas_id), deleted_at: null },
            include: {
                tahun: true,
                siswa: {
                    where: { deleted_at: null },
                    select: { id: true, nama: true }
                }
            }
        });

        if (!kelas) {
            return res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        }

        const records = await prisma.finalAbsensi.findMany({
            where: {
                kelas_id: parseInt(kelas_id),
                tanggal: targetDate,
                deleted_at: null
            }
        });

        const recordMap = new Map(records.map((r) => [r.siswa_id, r]));

        const laporanPerSiswa = kelas.siswa.map((siswa) => {
            const r = recordMap.get(siswa.id);
            return {
                siswa,
                status_final: r?.status_final ?? "Belum Finalisasi",
                total_hadir: r?.total_hadir ?? 0,
                total_izin: r?.total_izin ?? 0,
                total_sakit: r?.total_sakit ?? 0,
                total_alpha: r?.total_alpha ?? 0,
                total_mapel: r?.total_mapel ?? 0,
                is_finalized: r?.is_finalized ?? false
            };
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan laporan harian per kelas",
            data: {
                kelas: {
                    id: kelas.id,
                    nama: `${kelas.kelas} ${kelas.jurusan}`,
                    tahun_ajaran: kelas.tahun.tahun_ajaran
                },
                tanggal: formatDate(targetDate),
                hari: getHariFromDate(targetDate),
                statistik_kelas: hitungStatistikFinal(records),
                laporan_per_siswa: laporanPerSiswa
            }
        });
    } catch (error) {
        console.error("getRekapAbsensiKelas:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};


// rekap kelas bulanan
const getRekapAbsensiKelasMonthly = async (req, res) => {
    try {
        const { kelas_id, bulan, tahun } = req.query;

        if (!kelas_id || !bulan || !tahun) {
            return res.status(400).json({ success: false, message: "kelas_id, bulan, dan tahun wajib diisi" });
        }

        const bulanInt = parseInt(bulan);
        const tahunInt = parseInt(tahun);

        if (bulanInt < 1 || bulanInt > 12) {
            return res.status(400).json({ success: false, message: "Bulan tidak valid. Gunakan angka 1–12" });
        }

        const tglMulai = new Date(Date.UTC(tahunInt, bulanInt - 1, 1));
        const tglAkhir = new Date(Date.UTC(tahunInt, bulanInt, 0));

        const kelas = await prisma.kelas.findFirst({
            where: { id: parseInt(kelas_id), deleted_at: null },
            include: {
                tahun: true,
                siswa: { where: { deleted_at: null }, select: { id: true, nama: true } }
            }
        });

        if (!kelas) {
            return res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        }

        const records = await prisma.finalAbsensi.findMany({
            where: {
                kelas_id: parseInt(kelas_id),
                deleted_at: null,
                tanggal: { gte: tglMulai, lte: tglAkhir }
            },
            orderBy: { tanggal: "asc" }
        });

        if (!records.length) {
            return res.status(404).json({ success: false, message: "Tidak ada data absensi untuk kelas dan bulan tersebut" });
        }

        // Per minggu
        const statistikPerMinggu = [];
        let mingguKe = 1;
        let current = new Date(tglMulai);
        while (current <= tglAkhir) {
            const endOfWeek = new Date(current);
            endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
            const akhirMinggu = endOfWeek > tglAkhir ? tglAkhir : endOfWeek;
            const recMinggu = records.filter((r) => {
                const t = new Date(r.tanggal);
                return t >= current && t <= akhirMinggu;
            });
            statistikPerMinggu.push({
                minggu_ke: mingguKe,
                tanggal_mulai: formatDate(current),
                tanggal_akhir: formatDate(akhirMinggu),
                ...hitungStatistikFinal(recMinggu)
            });
            current = new Date(akhirMinggu);
            current.setDate(current.getDate() + 1);
            mingguKe++;
        }

        // Per siswa
        const statistikPerSiswa = kelas.siswa.map((siswa) => {
            const recSiswa = records.filter((r) => r.siswa_id === siswa.id);
            return {
                siswa,
                statistik: hitungStatistikFinal(recSiswa),
                riwayat: recSiswa.map((r) => ({
                    tanggal: formatDate(r.tanggal),
                    status_final: r.status_final,
                    total_mapel: r.total_mapel
                }))
            };
        });

        return res.status(200).json({
            success: true,
            message: `Berhasil mengambil rekap absensi kelas bulan ${NAMA_BULAN[bulanInt - 1]} ${tahunInt}`,
            data: {
                kelas: {
                    id: kelas.id,
                    nama: `${kelas.kelas} ${kelas.jurusan}`,
                    tahun_ajaran: kelas.tahun.tahun_ajaran
                },
                periode: {
                    bulan: bulanInt, nama_bulan: NAMA_BULAN[bulanInt - 1], tahun: tahunInt,
                    tanggal_mulai: formatDate(tglMulai),
                    tanggal_akhir: formatDate(tglAkhir)
                },
                statistik_kelas: hitungStatistikFinal(records),
                statistik_per_minggu: statistikPerMinggu,
                statistik_per_siswa: statistikPerSiswa
            }
        });
    } catch (error) {
        console.error("getRekapAbsensiKelasMonthly:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};

// rekap kelas tahunan
const getRekapAbsensiKelasSemester = async (req, res) => {
    try {
        const { kelas_id, tahun, semester } = req.query;

        if (!kelas_id || !tahun || !semester) {
            return res.status(400).json({ success: false, message: "kelas_id, tahun, dan semester wajib diisi" });
        }

        if (!["1", "2"].includes(semester)) {
            return res.status(400).json({ success: false, message: "Semester tidak valid. Gunakan: 1 atau 2" });
        }

        const tahunInt = parseInt(tahun);
        const tglMulai = semester === "1"
            ? new Date(Date.UTC(tahunInt, 0, 1))
            : new Date(Date.UTC(tahunInt, 6, 1));
        const tglAkhir = semester === "1"
            ? new Date(Date.UTC(tahunInt, 5, 30))
            : new Date(Date.UTC(tahunInt, 11, 31));

        const kelas = await prisma.kelas.findFirst({
            where: { id: parseInt(kelas_id), deleted_at: null },
            include: {
                tahun: true,
                siswa: { where: { deleted_at: null }, select: { id: true, nama: true } }
            }
        });

        if (!kelas) {
            return res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        }

        const records = await prisma.finalAbsensi.findMany({
            where: {
                kelas_id: parseInt(kelas_id),
                deleted_at: null,
                tanggal: { gte: tglMulai, lte: tglAkhir }
            },
            orderBy: { tanggal: "asc" }
        });

        if (!records.length) {
            return res.status(404).json({ success: false, message: "Tidak ada data absensi untuk kelas dan semester tersebut" });
        }

        const statistikPerSiswa = kelas.siswa.map((siswa) => {
            const recSiswa = records.filter((r) => r.siswa_id === siswa.id);

            // Per bulan dalam semester
            const bulanRange = semester === "1" ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
            const perBulan = bulanRange.map((i) => {
                const rec = recSiswa.filter((r) => new Date(r.tanggal).getUTCMonth() === i);
                return { bulan: i + 1, nama_bulan: NAMA_BULAN[i], ...hitungStatistikFinal(rec) };
            });

            return {
                siswa,
                statistik: hitungStatistikFinal(recSiswa),
                per_bulan: perBulan
            };
        });

        return res.status(200).json({
            success: true,
            message: `Berhasil mengambil rekap absensi kelas semester ${semester} tahun ${tahunInt}`,
            data: {
                kelas: {
                    id: kelas.id,
                    nama: `${kelas.kelas} ${kelas.jurusan}`,
                    tahun_ajaran: kelas.tahun.tahun_ajaran
                },
                tahun: tahunInt,
                semester: parseInt(semester),
                periode: {
                    tanggal_mulai: formatDate(tglMulai),
                    tanggal_akhir: formatDate(tglAkhir)
                },
                statistik_kelas: hitungStatistikFinal(records),
                statistik_per_siswa: statistikPerSiswa
            }
        });
    } catch (error) {
        console.error("getRekapAbsensiKelasSemester:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};

// rekap kelas tahunan
const getRekapAbsensiKelasYearly = async (req, res) => {
    try {
        const { kelas_id, tahun } = req.query;

        if (!kelas_id || !tahun) {
            return res.status(400).json({ success: false, message: "kelas_id dan tahun wajib diisi" });
        }

        const tahunInt = parseInt(tahun);
        const tglMulai = new Date(Date.UTC(tahunInt, 0, 1));
        const tglAkhir = new Date(Date.UTC(tahunInt, 11, 31));

        const kelas = await prisma.kelas.findFirst({
            where: { id: parseInt(kelas_id), deleted_at: null },
            include: {
                tahun: true,
                siswa: { where: { deleted_at: null }, select: { id: true, nama: true } }
            }
        });

        if (!kelas) {
            return res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        }

        const records = await prisma.finalAbsensi.findMany({
            where: {
                kelas_id: parseInt(kelas_id),
                deleted_at: null,
                tanggal: { gte: tglMulai, lte: tglAkhir }
            },
            orderBy: { tanggal: "asc" }
        });

        if (!records.length) {
            return res.status(404).json({ success: false, message: "Tidak ada data absensi untuk kelas dan tahun tersebut" });
        }

        const perBulanKelas = Array.from({ length: 12 }, (_, i) => {
            const rec = records.filter((r) => new Date(r.tanggal).getUTCMonth() === i);
            return { bulan: i + 1, nama_bulan: NAMA_BULAN[i], ...hitungStatistikFinal(rec) };
        });

        const statistikPerSiswa = kelas.siswa.map((siswa) => {
            const recSiswa = records.filter((r) => r.siswa_id === siswa.id);
            const perBulan = Array.from({ length: 12 }, (_, i) => {
                const rec = recSiswa.filter((r) => new Date(r.tanggal).getUTCMonth() === i);
                return { bulan: i + 1, nama_bulan: NAMA_BULAN[i], ...hitungStatistikFinal(rec) };
            });
            return {
                siswa,
                statistik: hitungStatistikFinal(recSiswa),
                per_bulan: perBulan
            };
        });

        return res.status(200).json({
            success: true,
            message: `Berhasil mengambil rekap absensi kelas tahun ${tahunInt}`,
            data: {
                kelas: {
                    id: kelas.id,
                    nama: `${kelas.kelas} ${kelas.jurusan}`,
                    tahun_ajaran: kelas.tahun.tahun_ajaran
                },
                tahun: tahunInt,
                periode: {
                    tanggal_mulai: formatDate(tglMulai),
                    tanggal_akhir: formatDate(tglAkhir)
                },
                statistik_kelas: hitungStatistikFinal(records),
                statistik_per_bulan: perBulanKelas,
                statistik_per_siswa: statistikPerSiswa
            }
        });
    } catch (error) {
        console.error("getRekapAbsensiKelasTahunan:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};


// rekap semua kelas
const getRekapAbsensiSemuaKelas = async (req, res) => {
    try {
        const { tanggal_mulai, tanggal_akhir, tahun_ajaran_id } = req.query;

        if (!tanggal_mulai || !tanggal_akhir) {
            return res.status(400).json({ success: false, message: "tanggal_mulai dan tanggal_akhir wajib diisi" });
        }

        const tglMulai = parseTanggal(tanggal_mulai);
        const tglAkhir = parseTanggal(tanggal_akhir);

        if (!tglMulai || !tglAkhir || tglMulai > tglAkhir) {
            return res.status(400).json({ success: false, message: "Format atau urutan tanggal tidak valid" });
        }

        if ((tglAkhir - tglMulai) / (1000 * 60 * 60 * 24) > 366) {
            return res.status(400).json({ success: false, message: "Range tanggal maksimal 1 tahun" });
        }

        const semuaKelas = await prisma.kelas.findMany({
            where: {
                deleted_at: null,
                ...(tahun_ajaran_id ? { tahun_ajaran_id: parseInt(tahun_ajaran_id) } : {})
            },
            include: {
                tahun: { select: { tahun_ajaran: true } },
                _count: { select: { siswa: { where: { deleted_at: null } } } }
            }
        });

        if (!semuaKelas.length) {
            return res.status(404).json({ success: false, message: "Tidak ada kelas aktif" });
        }

        const kelasIds = semuaKelas.map((k) => k.id);

        const records = await prisma.finalAbsensi.findMany({
            where: {
                kelas_id: { in: kelasIds },
                deleted_at: null,
                tanggal: { gte: tglMulai, lte: tglAkhir }
            },
            select: { kelas_id: true, status_final: true }
        });

        // Statistik global
        const global = hitungStatistikFinal(records.map((r) => ({ status_final: r.status_final })));

        // Statistik per kelas
        const kelasStatMap = {};
        for (const r of records) {
            if (!kelasStatMap[r.kelas_id]) kelasStatMap[r.kelas_id] = [];
            kelasStatMap[r.kelas_id].push(r);
        }

        const statistikPerKelas = semuaKelas.map((kelas) => {
            const rec = kelasStatMap[kelas.id] ?? [];
            return {
                kelas_id: kelas.id,
                nama: `${kelas.kelas} ${kelas.jurusan}`,
                tahun_ajaran: kelas.tahun.tahun_ajaran,
                total_siswa: kelas._count.siswa,
                statistik: hitungStatistikFinal(rec)
            };
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan rekap absensi semua kelas",
            data: {
                periode: {
                    tanggal_mulai: formatDate(tglMulai),
                    tanggal_akhir: formatDate(tglAkhir)
                },
                total_kelas: semuaKelas.length,
                total_siswa: semuaKelas.reduce((s, k) => s + k._count.siswa, 0),
                statistik_global: global,
                statistik_per_kelas: statistikPerKelas
            }
        });
    } catch (error) {
        console.error("getRekapAbsensiSemuaKelas:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};

module.exports = {
    getRekapAbsensiSiswa,
    getRekapAbsensiSiswaWeekly,
    getRekapAbsensiSiswaMonthly,
    getRekapAbsensiSiswaYearly,
    getRekapAbsensiKelas,
    getRekapAbsensiKelasMonthly,
    getRekapAbsensiKelasSemester,
    getRekapAbsensiKelasYearly,
    getRekapAbsensiSemuaKelas
};