const ExcelJS = require("exceljs");
const prisma = require("../config/prisma");
const { formatDate, formatTime, formatDateTime, parseTanggal, validateHari } = require("../helper/date");
const {
    COLORS, STATUS_COLOR,
    headerStyle, dataStyle, titleRow, subtitleRow, summaryBox,
    hitungStatistik, sendExcel, newWorkbook,
} = require("../helper/excelHelper");

// nama bulan untuk sheet statistik per bulan
const NAMA_BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];


// get rekap absensi per siswa dengan filter tanggal dan mapel
const exportRekapSiswa = async (req, res) => {
    try {
        const { siswa_id, tanggal_mulai, tanggal_akhir, mapel_id } = req.query;

        if (!siswa_id) {
            return res.status(400).json({ success: false, message: "siswa_id diperlukan" });
        }

        const detail = await prisma.detailAbsensiSiswa.findMany({
            where: {
                deleted_at: null,
                absensi: {
                    siswa_id,
                    deleted_at: null,
                    tanggal: {
                        gte: tanggal_mulai ? parseTanggal(tanggal_mulai) : undefined,
                        lte: tanggal_akhir ? parseTanggal(tanggal_akhir) : undefined,
                    },
                },
                ...(mapel_id
                    ? { jadwal: { mapel_id: parseInt(mapel_id), deleted_at: null } }
                    : { jadwal: { deleted_at: null } }),
            },
            include: {
                absensi: {
                    include: {
                        siswa: {
                            select: {
                                id: true, nama: true,
                                kelas: { include: { jurusan: true, tahun: true } },
                            },
                        },
                    },
                },
                jadwal: { include: { mata_pelajaran: true } },
                guru: { select: { nama: true } },
            },
            orderBy: { absensi: { tanggal: "desc" } },
        });

        if (!detail.length) {
            return res.status(404).json({ success: false, message: "Data absensi tidak ditemukan" });
        }

        const siswa = detail[0].absensi.siswa;
        const stats = hitungStatistik(detail);
        const wb = newWorkbook(ExcelJS);
        const sheet = wb.addWorksheet("Rekap Absensi");
        const COLS = 9;

        titleRow(sheet, `Rekap Absensi — ${siswa.nama}`, COLS, 1);
        subtitleRow(
            sheet,
            `Kelas: ${siswa.kelas?.kelas ?? "-"} ${siswa.kelas?.jurusan?.nama_jurusan ?? ""}  |  ` +
            `Tahun Ajaran: ${siswa.kelas?.tahun?.tahun_ajaran ?? "-"}  |  ` +
            `Periode: ${tanggal_mulai ?? "Awal"} s/d ${tanggal_akhir ?? "Sekarang"}`,
            COLS, 2,
        );
        sheet.addRow([]);
        summaryBox(sheet, stats, 4);
        sheet.addRow([]);
        sheet.addRow([]);

        const hRow = sheet.addRow(["No", "Tanggal", "Mata Pelajaran", "Status", "Jam Absen",
            "Tap In", "Status Tap In", "Guru", "Keterangan"]);
        hRow.eachCell(c => headerStyle(c));
        sheet.getRow(hRow.number).height = 20;

        detail.forEach((d, i) => {
            const row = sheet.addRow([
                i + 1,
                formatDate(d.absensi.tanggal),
                d.jadwal?.mata_pelajaran?.nama_mapel ?? "-",
                d.status,
                formatDateTime(d.jam_absen),
                formatTime(d.absensi.tap_in),
                d.absensi.status_tapin ?? "-",
                d.guru?.nama ?? "-",
                d.keterangan ?? "-",
            ]);
            const bgRow = i % 2 === 0 ? COLORS.gray : COLORS.white;
            row.eachCell((c, col) => {
                dataStyle(c, col === 4 ? (STATUS_COLOR[d.status] ?? bgRow) : bgRow, col === 3);
            });
            sheet.getRow(row.number).height = 18;
        });

        // Sheet statistik per mapel
        const mapelMap = detail.reduce((acc, d) => {
            const nama = d.jadwal?.mata_pelajaran?.nama_mapel ?? "Unknown";
            if (!acc[nama]) acc[nama] = { total: 0, hadir: 0, izin: 0, sakit: 0, alpha: 0 };
            acc[nama].total++;
            acc[nama][d.status.toLowerCase()]++;
            return acc;
        }, {});

        const sheetMapel = wb.addWorksheet("Statistik Per Mapel");
        titleRow(sheetMapel, `Statistik Per Mapel — ${siswa.nama}`, 8, 1);
        sheetMapel.addRow([]);
        const mhRow = sheetMapel.addRow(["No", "Mata Pelajaran", "Total", "Hadir", "Izin", "Sakit", "Alpha", "% Hadir"]);
        mhRow.eachCell(c => headerStyle(c));
        Object.entries(mapelMap).forEach(([mapel, s], i) => {
            const pct = s.total > 0 ? ((s.hadir / s.total) * 100).toFixed(2) + "%" : "0.00%";
            const row = sheetMapel.addRow([i + 1, mapel, s.total, s.hadir, s.izin, s.sakit, s.alpha, pct]);
            const bg = i % 2 === 0 ? COLORS.gray : COLORS.white;
            row.eachCell((c, col) => {
                dataStyle(c, col === 4 ? COLORS.hadir : col === 5 ? COLORS.izin
                    : col === 6 ? COLORS.sakit : col === 7 ? COLORS.alpha : bg, col === 2);
            });
        });
        [5, 26, 10, 10, 10, 10, 10, 12].forEach((w, i) => { sheetMapel.getColumn(i + 1).width = w; });
        [5, 14, 22, 12, 18, 10, 14, 16, 22].forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

        const filename = `Rekap_Siswa_${siswa.nama.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
        await sendExcel(res, wb, filename);

    } catch (error) {
        console.error("exportRekapSiswa:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server", error: error.message });
    }
};

// Rekap kelas harian
const exportRekapKelasHarian = async (req, res) => {
    try {
        const { kelas_id, tanggal } = req.query;

        if (!kelas_id || !tanggal) {
            return res.status(400).json({ success: false, message: "kelas_id dan tanggal wajib diisi" });
        }

        const targetDate = parseTanggal(tanggal);
        const hari = validateHari(targetDate);

        const kelas = await prisma.kelas.findFirst({
            where: { id: parseInt(kelas_id), deleted_at: null },
            include: {
                jurusan: true, tahun: true,
                siswa: { where: { deleted_at: null }, select: { id: true, nama: true } },
            },
        });

        if (!kelas) {
            return res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        }

        const jadwalList = await prisma.jadwal.findMany({
            where: { kelas_id: kelas.id, hari, deleted_at: null },
            include: {
                mata_pelajaran: true,
                guru: true,
                detail_absensi: {
                    where: { deleted_at: null, absensi: { tanggal: targetDate } },
                    include: { absensi: { include: { siswa: true } } },
                },
            },
            orderBy: { jam_mulai: "asc" },
        });

        const wb = newWorkbook(ExcelJS);
        const sheet = wb.addWorksheet("Rekap Harian");
        const COLS = 3 + jadwalList.length * 2;

        titleRow(sheet, `Rekap Harian — ${kelas.kelas} ${kelas.jurusan.nama_jurusan}`, COLS, 1);
        subtitleRow(sheet,
            `Tanggal: ${formatDate(targetDate)}  |  Hari: ${hari}  |  Tahun Ajaran: ${kelas.tahun.tahun_ajaran}`,
            COLS, 2,
        );
        sheet.addRow([]);

        const h1 = sheet.addRow([
            "No", "Nama Siswa", "Tap In",
            ...jadwalList.flatMap(j => [j.mata_pelajaran.nama_mapel, ""]),
        ]);
        const h2 = sheet.addRow([
            "", "", "",
            ...jadwalList.flatMap(() => ["Status", "Ket"]),
        ]);

        jadwalList.forEach((_, i) => {
            const c = 4 + i * 2;
            sheet.mergeCells(h1.number, c, h1.number, c + 1);
        });
        [[1, 1], [2, 2], [3, 3]].forEach(([c1, c2]) => {
            sheet.mergeCells(h1.number, c1, h2.number, c2);
        });

        h1.eachCell(c => headerStyle(c));
        h2.eachCell(c => headerStyle(c, COLORS.subheader));
        sheet.getRow(h1.number).height = 20;
        sheet.getRow(h2.number).height = 18;

        const hJam = sheet.addRow([
            "", "", "",
            ...jadwalList.flatMap(j => [
                `${formatTime(j.jam_mulai)}–${formatTime(j.jam_selesai)}`,
                j.guru.nama,
            ]),
        ]);
        hJam.eachCell(c => {
            c.font = { italic: true, size: 9, color: { argb: "FF555555" }, name: "Arial" };
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLORS.accent } };
            c.alignment = { horizontal: "center", vertical: "middle" };
        });
        sheet.getRow(hJam.number).height = 15;

        kelas.siswa.forEach((siswa, i) => {
            const anyAbsensi = jadwalList
                .flatMap(j => j.detail_absensi)
                .find(d => d.absensi.siswa_id === siswa.id)?.absensi;

            const rowData = [
                i + 1,
                siswa.nama,
                anyAbsensi ? formatTime(anyAbsensi.tap_in) : "-",
                ...jadwalList.flatMap(j => {
                    const det = j.detail_absensi.find(d => d.absensi.siswa_id === siswa.id);
                    return [det?.status ?? "BELUM_ABSEN", det?.keterangan ?? "-"];
                }),
            ];
            const row = sheet.addRow(rowData);
            const bgRow = i % 2 === 0 ? COLORS.gray : COLORS.white;
            row.eachCell((c, col) => {
                const isStatus = col >= 4 && (col - 4) % 2 === 0;
                dataStyle(c, isStatus ? (STATUS_COLOR[c.value] ?? COLORS.gray) : bgRow, col === 2);
            });
            sheet.getRow(row.number).height = 18;
        });

        sheet.getColumn(1).width = 5;
        sheet.getColumn(2).width = 24;
        sheet.getColumn(3).width = 10;
        jadwalList.forEach((_, i) => {
            sheet.getColumn(4 + i * 2).width = 14;
            sheet.getColumn(4 + i * 2 + 1).width = 22;
        });

        const filename = `Rekap_Harian_${kelas.kelas}${kelas.jurusan.nama_jurusan.replace(/\s+/g, "")}_${tanggal}.xlsx`;
        await sendExcel(res, wb, filename);

    } catch (error) {
        console.error("exportRekapKelasHarian:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server", error: error.message });
    }
};

// Rekap Kelas Tahunan  
const exportRekapKelasTahunan = async (req, res) => {
    try {
        const { kelas_id, tahun } = req.query;

        if (!kelas_id || !tahun) {
            return res.status(400).json({ success: false, message: "kelas_id dan tahun wajib diisi" });
        }

        const tahunInt = parseInt(tahun);
        const tanggalMulai = new Date(Date.UTC(tahunInt, 0, 1));
        const tanggalAkhir = new Date(Date.UTC(tahunInt, 11, 31));

        const kelas = await prisma.kelas.findFirst({
            where: { id: parseInt(kelas_id), deleted_at: null },
            include: {
                jurusan: true, tahun: true,
                siswa: { where: { deleted_at: null }, select: { id: true, nama: true } },
            },
        });

        if (!kelas) {
            return res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        }

        const detailAbsensi = await prisma.detailAbsensiSiswa.findMany({
            where: {
                deleted_at: null,
                absensi: {
                    deleted_at: null,
                    tanggal: { gte: tanggalMulai, lte: tanggalAkhir },
                    siswa: { kelas_id: parseInt(kelas_id) },
                },
            },
            include: {
                absensi: { include: { siswa: { select: { id: true, nama: true } } } },
                jadwal: { include: { mata_pelajaran: true } },
            },
            orderBy: { absensi: { tanggal: "asc" } },
        });

        if (!detailAbsensi.length) {
            return res.status(404).json({ success: false, message: "Tidak ada data absensi untuk tahun tersebut" });
        }

        const wb = newWorkbook(ExcelJS);
        const nama = `${kelas.kelas} ${kelas.jurusan.nama_jurusan}`;

        // Sheet 1 — Rekap Per Siswa
        const sheetSiswa = wb.addWorksheet("Rekap Per Siswa");
        const COLS = 8;

        titleRow(sheetSiswa, `Rekap Tahunan ${tahunInt} — ${nama}`, COLS, 1);
        subtitleRow(sheetSiswa,
            `Tahun Ajaran: ${kelas.tahun.tahun_ajaran}  |  ` +
            `Periode: ${formatDate(tanggalMulai)} s/d ${formatDate(tanggalAkhir)}`,
            COLS, 2,
        );
        sheetSiswa.addRow([]);
        summaryBox(sheetSiswa, hitungStatistik(detailAbsensi), 4);
        sheetSiswa.addRow([]);
        sheetSiswa.addRow([]);

        const hRow = sheetSiswa.addRow(["No", "Nama Siswa", "Total", "Hadir", "Izin", "Sakit", "Alpha", "% Hadir"]);
        hRow.eachCell(c => headerStyle(c));
        sheetSiswa.getRow(hRow.number).height = 20;

        const firstDataRow = sheetSiswa.rowCount + 1;
        kelas.siswa.forEach((siswa, i) => {
            const ds = detailAbsensi.filter(d => d.absensi.siswa_id === siswa.id);
            const s = hitungStatistik(ds);
            const row = sheetSiswa.addRow([
                i + 1, siswa.nama,
                s.total_pertemuan, s.hadir, s.izin, s.sakit, s.alpha,
                s.total_pertemuan > 0 ? s.persentase_kehadiran + "%" : "0.00%",
            ]);
            row.eachCell((c, col) => {
                const bg = col === 4 ? COLORS.hadir : col === 5 ? COLORS.izin
                    : col === 6 ? COLORS.sakit : col === 7 ? COLORS.alpha
                        : (i % 2 === 0 ? COLORS.gray : COLORS.white);
                dataStyle(c, bg, col === 2);
            });
            sheetSiswa.getRow(row.number).height = 18;
        });

        const lastDataRow = sheetSiswa.rowCount;

        const totalRowIndex = lastDataRow + 1;

        const totRow = sheetSiswa.addRow([
            "", "TOTAL",
            { formula: `SUM(C${firstDataRow}:C${lastDataRow})` },
            { formula: `SUM(D${firstDataRow}:D${lastDataRow})` },
            { formula: `SUM(E${firstDataRow}:E${lastDataRow})` },
            { formula: `SUM(F${firstDataRow}:F${lastDataRow})` },
            { formula: `SUM(G${firstDataRow}:G${lastDataRow})` },
            { formula: `IF(C${totalRowIndex}>0, D${totalRowIndex}/C${totalRowIndex}, 0)` },
        ]);

        totRow.eachCell(c => headerStyle(c, COLORS.subheader));
        sheetSiswa.getRow(totRow.number).height = 20;
        [5, 26, 10, 10, 10, 10, 10, 12].forEach((w, i) => { sheetSiswa.getColumn(i + 1).width = w; });

        // Sheet 2 — Statistik Per Bulan  
        const sheetBulan = wb.addWorksheet("Statistik Per Bulan");
        titleRow(sheetBulan, `Statistik Per Bulan — ${nama} (${tahunInt})`, 7, 1);
        sheetBulan.addRow([]);
        const bhRow = sheetBulan.addRow(["Bulan", "Total", "Hadir", "Izin", "Sakit", "Alpha", "% Hadir"]);
        bhRow.eachCell(c => headerStyle(c));

        Array.from({ length: 12 }, (_, i) => {
            const ds = detailAbsensi.filter(d => new Date(d.absensi.tanggal).getUTCMonth() === i);
            const s = hitungStatistik(ds);
            const row = sheetBulan.addRow([
                NAMA_BULAN[i], s.total_pertemuan, s.hadir, s.izin, s.sakit, s.alpha,
                s.total_pertemuan > 0 ? s.persentase_kehadiran + "%" : "0.00%",
            ]);
            const bg = i % 2 === 0 ? COLORS.gray : COLORS.white;
            row.eachCell((c, col) => {
                dataStyle(c, col === 3 ? COLORS.hadir : col === 4 ? COLORS.izin
                    : col === 5 ? COLORS.sakit : col === 6 ? COLORS.alpha : bg, col === 1);
            });
        });
        [16, 10, 10, 10, 10, 10, 12].forEach((w, i) => { sheetBulan.getColumn(i + 1).width = w; });

        // Sheet 3 — Statistik Per Mapel
        const mapelMap = {};
        detailAbsensi.forEach(d => {
            const nm = d.jadwal?.mata_pelajaran?.nama_mapel ?? "Unknown";
            if (!mapelMap[nm]) mapelMap[nm] = { total: 0, hadir: 0, izin: 0, sakit: 0, alpha: 0 };
            mapelMap[nm].total++;
            mapelMap[nm][d.status.toLowerCase()]++;
        });

        const sheetMapel = wb.addWorksheet("Statistik Per Mapel");
        titleRow(sheetMapel, `Statistik Per Mapel — ${nama} (${tahunInt})`, 8, 1);
        sheetMapel.addRow([]);
        const mhRow = sheetMapel.addRow(["No", "Mata Pelajaran", "Total", "Hadir", "Izin", "Sakit", "Alpha", "% Hadir"]);
        mhRow.eachCell(c => headerStyle(c));
        Object.entries(mapelMap).forEach(([mapel, s], i) => {
            const pct = s.total > 0 ? ((s.hadir / s.total) * 100).toFixed(2) + "%" : "0.00%";
            const row = sheetMapel.addRow([i + 1, mapel, s.total, s.hadir, s.izin, s.sakit, s.alpha, pct]);
            const bg = i % 2 === 0 ? COLORS.gray : COLORS.white;
            row.eachCell((c, col) => {
                dataStyle(c, col === 4 ? COLORS.hadir : col === 5 ? COLORS.izin
                    : col === 6 ? COLORS.sakit : col === 7 ? COLORS.alpha : bg, col === 2);
            });
        });
        [5, 28, 10, 10, 10, 10, 10, 12].forEach((w, i) => { sheetMapel.getColumn(i + 1).width = w; });

        const filename = `Rekap_Tahunan_${nama.replace(/\s+/g, "_")}_${tahunInt}.xlsx`;
        await sendExcel(res, wb, filename);

    } catch (error) {
        console.error("exportRekapKelasTahunan:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server", error: error.message });
    }
};

// Rekap Kelas Semester  

const exportRekapKelasSemester = async (req, res) => {
    try {
        const { kelas_id, tahun, semester } = req.query;

        if (!kelas_id || !tahun || !semester) {
            return res.status(400).json({ success: false, message: "kelas_id, tahun, dan semester wajib diisi" });
        }
        if (!["1", "2"].includes(semester)) {
            return res.status(400).json({ success: false, message: "Semester tidak valid. Gunakan: 1 atau 2" });
        }

        const tahunInt = parseInt(tahun);
        const tanggalMulai = semester === "1"
            ? new Date(Date.UTC(tahunInt, 0, 1))
            : new Date(Date.UTC(tahunInt, 6, 1));
        const tanggalAkhir = semester === "1"
            ? new Date(Date.UTC(tahunInt, 5, 30))
            : new Date(Date.UTC(tahunInt, 11, 31));
        const labelSem = semester === "1" ? "Semester 1 (Januari–Juni)" : "Semester 2 (Juli–Desember)";

        const kelas = await prisma.kelas.findFirst({
            where: { id: parseInt(kelas_id), deleted_at: null },
            include: {
                jurusan: true, tahun: true,
                siswa: { where: { deleted_at: null }, select: { id: true, nama: true } },
            },
        });

        if (!kelas) {
            return res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        }

        const detailAbsensi = await prisma.detailAbsensiSiswa.findMany({
            where: {
                deleted_at: null,
                absensi: {
                    deleted_at: null,
                    tanggal: { gte: tanggalMulai, lte: tanggalAkhir },
                    siswa: { kelas_id: parseInt(kelas_id) },
                },
            },
            include: {
                absensi: { include: { siswa: { select: { id: true, nama: true } } } },
                jadwal: { include: { mata_pelajaran: true } },
            },
            orderBy: { absensi: { tanggal: "asc" } },
        });

        if (!detailAbsensi.length) {
            return res.status(404).json({ success: false, message: "Tidak ada data absensi untuk semester tersebut" });
        }

        const wb = newWorkbook(ExcelJS);
        const nama = `${kelas.kelas} ${kelas.jurusan.nama_jurusan}`;

        // Sheet 1 — Rekap Per Siswa
        const sheet = wb.addWorksheet("Rekap Per Siswa");
        const COLS = 8;

        titleRow(sheet, `Rekap ${labelSem} ${tahunInt} — ${nama}`, COLS, 1);
        subtitleRow(sheet,
            `Tahun Ajaran: ${kelas.tahun.tahun_ajaran}  |  ` +
            `Periode: ${formatDate(tanggalMulai)} s/d ${formatDate(tanggalAkhir)}`,
            COLS, 2,
        );
        sheet.addRow([]);
        summaryBox(sheet, hitungStatistik(detailAbsensi), 4);
        sheet.addRow([]);
        sheet.addRow([]);

        const hRow = sheet.addRow(["No", "Nama Siswa", "Total", "Hadir", "Izin", "Sakit", "Alpha", "% Hadir"]);
        hRow.eachCell(c => headerStyle(c));
        sheet.getRow(hRow.number).height = 20;

        const firstDataRow = sheet.rowCount + 1;
        kelas.siswa.forEach((siswa, i) => {
            const ds = detailAbsensi.filter(d => d.absensi.siswa_id === siswa.id);
            const s = hitungStatistik(ds);
            const row = sheet.addRow([
                i + 1, siswa.nama,
                s.total_pertemuan, s.hadir, s.izin, s.sakit, s.alpha,
                s.total_pertemuan > 0 ? s.persentase_kehadiran + "%" : "0.00%",
            ]);
            row.eachCell((c, col) => {
                const bg = col === 4 ? COLORS.hadir : col === 5 ? COLORS.izin
                    : col === 6 ? COLORS.sakit : col === 7 ? COLORS.alpha
                        : (i % 2 === 0 ? COLORS.gray : COLORS.white);
                dataStyle(c, bg, col === 2);
            });
            sheet.getRow(row.number).height = 18;
        });

        const lastDataRow = sheet.rowCount;
        const totalRowIndex = lastDataRow + 1;

        const totRow = sheet.addRow([
            "", "TOTAL",
            { formula: `SUM(C${firstDataRow}:C${lastDataRow})` },
            { formula: `SUM(D${firstDataRow}:D${lastDataRow})` },
            { formula: `SUM(E${firstDataRow}:E${lastDataRow})` },
            { formula: `SUM(F${firstDataRow}:F${lastDataRow})` },
            { formula: `SUM(G${firstDataRow}:G${lastDataRow})` },
            { formula: `IF(C${totalRowIndex}>0, D${totalRowIndex}/C${totalRowIndex}, 0)` },
        ]);

        totRow.eachCell(c => headerStyle(c, COLORS.subheader));
        sheet.getRow(totRow.number).height = 20;
        [5, 26, 10, 10, 10, 10, 10, 12].forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

        // Sheet 2 — Statistik Per Mapel
        const mapelMap = {};
        detailAbsensi.forEach(d => {
            const nm = d.jadwal?.mata_pelajaran?.nama_mapel ?? "Unknown";
            if (!mapelMap[nm]) mapelMap[nm] = { total: 0, hadir: 0, izin: 0, sakit: 0, alpha: 0 };
            mapelMap[nm].total++;
            mapelMap[nm][d.status.toLowerCase()]++;
        });

        const sheetMapel = wb.addWorksheet("Statistik Per Mapel");
        titleRow(sheetMapel, `Statistik Per Mapel — ${nama} (${labelSem} ${tahunInt})`, 8, 1);
        sheetMapel.addRow([]);
        const mhRow = sheetMapel.addRow(["No", "Mata Pelajaran", "Total", "Hadir", "Izin", "Sakit", "Alpha", "% Hadir"]);
        mhRow.eachCell(c => headerStyle(c));
        Object.entries(mapelMap).forEach(([mapel, s], i) => {
            const pct = s.total > 0 ? ((s.hadir / s.total) * 100).toFixed(2) + "%" : "0.00%";
            const row = sheetMapel.addRow([i + 1, mapel, s.total, s.hadir, s.izin, s.sakit, s.alpha, pct]);
            const bg = i % 2 === 0 ? COLORS.gray : COLORS.white;
            row.eachCell((c, col) => {
                dataStyle(c, col === 4 ? COLORS.hadir : col === 5 ? COLORS.izin
                    : col === 6 ? COLORS.sakit : col === 7 ? COLORS.alpha : bg, col === 2);
            });
        });
        [5, 28, 10, 10, 10, 10, 10, 12].forEach((w, i) => { sheetMapel.getColumn(i + 1).width = w; });

        const filename = `Rekap_Sem${semester}_${nama.replace(/\s+/g, "_")}_${tahunInt}.xlsx`;
        await sendExcel(res, wb, filename);

    } catch (error) {
        console.error("exportRekapKelasSemester:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server", error: error.message });
    }
};

// Rekap By Jadwal 


const exportRekapByJadwal = async (req, res) => {
    try {
        const { jadwal_id, tanggal } = req.query;

        if (!jadwal_id || !tanggal) {
            return res.status(400).json({ success: false, message: "jadwal_id dan tanggal wajib diisi" });
        }

        const jadwal = await prisma.jadwal.findFirst({
            where: { id: parseInt(jadwal_id), deleted_at: null },
            include: {
                mata_pelajaran: true,
                guru: { select: { nama: true } },
                kelas: {
                    include: {
                        jurusan: true,
                        siswa: { where: { deleted_at: null }, select: { id: true, nama: true } },
                    },
                },
            },
        });

        if (!jadwal) {
            return res.status(404).json({ success: false, message: "Jadwal tidak ditemukan" });
        }

        const date = parseTanggal(tanggal);
        const absensiList = await prisma.absensiSiswa.findMany({
            where: { tanggal: date, deleted_at: null, siswa: { kelas_id: jadwal.kelas_id } },
            include: {
                siswa: { select: { id: true, nama: true } },
                detail: {
                    where: { jadwal_id: parseInt(jadwal_id), deleted_at: null },
                    select: { status: true, jam_absen: true, keterangan: true },
                },
            },
        });

        const absensiMap = new Map(absensiList.map(a => [a.siswa_id, a]));

        const rekap = jadwal.kelas.siswa.map(siswa => {
            const ab = absensiMap.get(siswa.id);
            const detail = ab?.detail?.[0] ?? null;
            return {
                nama: siswa.nama,
                tap_in: ab ? (formatTime(ab.tap_in) ?? "-") : "-",
                tap_out: ab ? (formatTime(ab.tap_out) ?? "-") : "-",
                status_tapin: ab?.status_tapin ?? "-",
                status_mapel: detail?.status ?? "ALPHA",
                jam_absen: detail ? formatDateTime(detail.jam_absen) : "-",
                keterangan: detail?.keterangan ?? "-",
            };
        });

        const hadir = rekap.filter(r => r.status_mapel === "HADIR").length;
        const alpha = rekap.filter(r => r.status_mapel === "ALPHA").length;
        const izin = rekap.filter(r => r.status_mapel === "IZIN").length;
        const sakit = rekap.filter(r => r.status_mapel === "SAKIT").length;
        const tepat = rekap.filter(r => r.status_tapin === "TEPAT_WAKTU").length;
        const telambat = rekap.filter(r => r.status_tapin === "TELAMBAT").length;
        const pct = rekap.length > 0 ? ((hadir / rekap.length) * 100).toFixed(2) : "0.00";

        const wb = newWorkbook(ExcelJS);
        const sheet = wb.addWorksheet("Rekap Jadwal");
        const COLS = 8;

        titleRow(sheet,
            `Rekap Absensi — ${jadwal.mata_pelajaran.nama_mapel}  |  ${jadwal.kelas.kelas} ${jadwal.kelas.jurusan.nama_jurusan}`,
            COLS, 1,
        );
        subtitleRow(sheet,
            `Guru: ${jadwal.guru.nama}  |  Tanggal: ${formatDate(date)}  |  ` +
            `Jam: ${formatTime(jadwal.jam_mulai)} – ${formatTime(jadwal.jam_selesai)}`,
            COLS, 2,
        );
        sheet.addRow([]);

        summaryBox(sheet, { total_pertemuan: rekap.length, hadir, izin, sakit, alpha, persentase_kehadiran: pct }, 4);

        // Info tepat waktu & terlambat
        const tepatCell = sheet.getCell(5, 7);
        const telambatCell = sheet.getCell(5, 8);
        tepatCell.value = `✓ Tepat: ${tepat}`;
        telambatCell.value = `⚠ Terlambat: ${telambat}`;
        [tepatCell, telambatCell].forEach(c => {
            c.font = { name: "Arial", size: 10, bold: true };
            c.alignment = { horizontal: "center", vertical: "middle" };
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + COLORS.accent } };
        });
        sheet.getColumn(7).width = 16;
        sheet.getColumn(8).width = 16;

        sheet.addRow([]);
        sheet.addRow([]);

        const hRow = sheet.addRow(["No", "Nama Siswa", "Tap In", "Tap Out", "Status Tap", "Status Mapel", "Jam Absen", "Keterangan"]);
        hRow.eachCell(c => headerStyle(c));
        sheet.getRow(hRow.number).height = 20;

        rekap.forEach((r, i) => {
            const row = sheet.addRow([i + 1, r.nama, r.tap_in, r.tap_out, r.status_tapin, r.status_mapel, r.jam_absen, r.keterangan]);
            const bgRow = i % 2 === 0 ? COLORS.gray : COLORS.white;
            row.eachCell((c, col) => {
                const bg = col === 6 ? (STATUS_COLOR[r.status_mapel] ?? bgRow)
                    : col === 5 && r.status_tapin === "TELAMBAT" ? COLORS.alpha
                        : bgRow;
                dataStyle(c, bg, col === 2);
            });
            sheet.getRow(row.number).height = 18;
        });

        [5, 26, 10, 10, 16, 14, 18, 24].forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

        const filename = `Rekap_Jadwal_${jadwal.mata_pelajaran.nama_mapel.replace(/\s+/g, "_")}_${tanggal}.xlsx`;
        await sendExcel(res, wb, filename);

    } catch (error) {
        console.error("exportRekapByJadwal:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server", error: error.message });
    }
};




module.exports = {
    exportRekapSiswa,
    exportRekapKelasHarian,
    exportRekapKelasTahunan,
    exportRekapKelasSemester,
    exportRekapByJadwal,
};