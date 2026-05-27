const ExcelJS = require("exceljs");
const prisma = require("../config/prisma");
const { parseTanggal, formatDate, getHariFromDate } = require("../helper/indexUtils");
const { hitungStatistikFinal } = require("../helper/helperFinalAbsensi");

//  Warna template 
const CLR = {
    YELLOW: "FFFFF2CC",
    GREEN: "FFD9EAD3",
    GRAY: "FFA5A5A5",
    DGRAY: "FFD9D9D9",
    WHITE: "FFFFFFFF",
    NONE: "00000000",
};

const BULAN = [
    "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
    "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
];
const BULAN_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

//  Helper styling 
function applyBorder(cell, type = "thin") {
    const style = { style: type, color: { argb: "FF000000" } };
    cell.border = {
        top: style,
        left: style,
        bottom: style,
        right: style,
    };
}

function styleCell(cell, { bold = false, fill = null, align = "center", wrap = false, sz = 11 } = {}) {
    cell.font = { name: "Arial", size: sz, bold };
    cell.alignment = { horizontal: align, vertical: "middle", wrapText: wrap };
    if (fill && fill !== CLR.NONE) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    }
    applyBorder(cell);
}

function hdrCell(ws, row, col, value, mergeEnd, fillColor) {
    const cell = ws.getCell(row, col);
    cell.value = value;
    styleCell(cell, { bold: true, fill: fillColor, align: "center" });
    if (mergeEnd && mergeEnd > col) {
        ws.mergeCells(row, col, row, mergeEnd);
    }
}

// Bangun sheet rekap kelas (bulanan/semester/tahunan)
function buildKelasSheet(ws, opts) {
    const {
        namaSekolah = "SMK TARUNA BHAKTI",
        namaKelas, tahunAjaran, semester = "GENAP",
        bulanList, siswas, dataPerSiswa,
        jumlahHariEfektif = 0,
        kepsekNama = "", kepsekNik = "",
        waliNama = "", waliNik = "",
        kotaTanggal = "",
    } = opts;

    const nBulan = bulanList.length;

    // Kolom layout:
    // A=1  B=2  C=3  D=4 | E...(E+3*nBulan-1)=data bulan | totS totI totA T
    const COL_A = 1, COL_B = 2, COL_C = 3, COL_D = 4;
    const COL_DATA_START = 5;
    const COL_TOT_S = COL_DATA_START + 3 * nBulan;
    const COL_TOT_I = COL_TOT_S + 1;
    const COL_TOT_A = COL_TOT_S + 2;
    const COL_T = COL_TOT_S + 3;
    const LAST_COL = COL_T;

    //  Lebar kolom 
    ws.getColumn(COL_A).width = 5.7;
    ws.getColumn(COL_B).width = 21.7;
    ws.getColumn(COL_C).width = 47.7;
    ws.getColumn(COL_D).width = 9.5;
    for (let c = COL_DATA_START; c <= COL_T; c++) {
        ws.getColumn(c).width = c === COL_DATA_START ? 7.3 : 7.5;
    }

    //  Row heights 
    ws.getRow(1).height = 25;
    ws.getRow(2).height = 20;
    ws.getRow(3).height = 18;

    //  Baris 1-3: Judul sekolah 
    const titleStyle = (row, text) => {
        const c = ws.getCell(row, 1);
        c.value = text;
        c.font = { name: "Arial", bold: true, size: row === 1 ? 14 : 12 };
        c.alignment = { horizontal: "center", vertical: "middle" };
        ws.mergeCells(row, 1, row, LAST_COL);
    };
    titleStyle(1, `DAFTAR HADIR PESERTA DIDIK SEMESTER ${semester}`);
    titleStyle(2, namaSekolah);
    titleStyle(3, `TAHUN AJARAN ${tahunAjaran}`);

    //  Baris 5: SEMESTER & KELAS 
    const midCol = Math.floor(LAST_COL / 2);
    const r5left = ws.getCell(5, 1);
    r5left.value = `SEMESTER ${semester}`;
    r5left.font = { name: "Arial", bold: true, size: 11 };
    r5left.alignment = { horizontal: "left" };
    ws.mergeCells(5, 1, 5, midCol);

    const r5right = ws.getCell(5, midCol + 1);
    r5right.value = `KELAS/TINGKAT  :  ${namaKelas}`;
    r5right.font = { name: "Arial", bold: true, size: 11 };
    r5right.alignment = { horizontal: "right" };
    ws.mergeCells(5, midCol + 1, 5, LAST_COL);

    //  Baris 6-7: Header tabel 
    const HDR_ROW1 = 6, HDR_ROW2 = 7;
    ws.getRow(HDR_ROW1).height = 22;
    ws.getRow(HDR_ROW2).height = 18;

    // Kolom tetap — merge 2 baris
    for (const [col, label] of [
        [COL_A, "NO"], [COL_B, "NIPD"],
        [COL_C, "NAMA PESERTA DIDIK"], [COL_D, "JK"],
    ]) {
        ws.mergeCells(HDR_ROW1, col, HDR_ROW2, col);
        const c = ws.getCell(HDR_ROW1, col);
        c.value = label;
        styleCell(c, { bold: true, align: "center" });
    }

    // Kolom bulan
    for (let bi = 0; bi < nBulan; bi++) {
        const bCol = COL_DATA_START + bi * 3;
        const fill = bi % 2 === 0 ? CLR.YELLOW : CLR.GREEN;
        const bulanLabel = BULAN[bulanList[bi] - 1];
        hdrCell(ws, HDR_ROW1, bCol, bulanLabel, bCol + 2, fill);
        for (const [offset, lbl] of [[0, "S"], [1, "I"], [2, "A"]]) {
            const c = ws.getCell(HDR_ROW2, bCol + offset);
            c.value = lbl;
            styleCell(c, { bold: true, fill, align: "center" });
        }
    }

    // Kolom total — merge 2 baris untuk label "TOTAL ABSENSI"
    hdrCell(ws, HDR_ROW1, COL_TOT_S, "TOTAL ABSENSI", COL_TOT_A, CLR.NONE);
    for (const [offset, lbl] of [[0, "S"], [1, "I"], [2, "A"]]) {
        const c = ws.getCell(HDR_ROW2, COL_TOT_S + offset);
        c.value = lbl;
        styleCell(c, { bold: true });
    }
    // Kolom T — merge 2 baris
    ws.mergeCells(HDR_ROW1, COL_T, HDR_ROW2, COL_T);
    const cT_hdr = ws.getCell(HDR_ROW1, COL_T);
    cT_hdr.value = "T";
    styleCell(cT_hdr, { bold: true, fill: CLR.DGRAY });

    //  Baris data siswa 
    const DATA_START_ROW = 8;

    for (let si = 0; si < siswas.length; si++) {
        const siswa = siswas[si];
        const dr = DATA_START_ROW + si;
        ws.getRow(dr).height = 16;

        const rowBg = si % 2 !== 0 ? CLR.WHITE : CLR.NONE;

        // Kolom tetap
        const setFixed = (col, val, align = "center", bold = false) => {
            const c = ws.getCell(dr, col);
            c.value = val;
            styleCell(c, { bold, fill: rowBg, align });
        };
        setFixed(COL_A, si + 1);
        setFixed(COL_B, siswa.NIPD ?? siswa.nipd ?? "");
        setFixed(COL_C, siswa.nama ?? "", "left");
        setFixed(COL_D, siswa.gender ?? siswa.jk ?? "");

        // Data per bulan
        const bulanData = dataPerSiswa.get(siswa.id) || new Map();
        let totS = 0, totI = 0, totA = 0;

        for (let bi = 0; bi < nBulan; bi++) {
            const bCol = COL_DATA_START + bi * 3;
            const fill = bi % 2 === 0 ? CLR.YELLOW : CLR.GREEN;
            const d = bulanData.get(bulanList[bi]) || { s: 0, i: 0, a: 0 };

            for (const [offset, val] of [[0, d.s], [1, d.i], [2, d.a]]) {
                const c = ws.getCell(dr, bCol + offset);
                c.value = val || 0;
                styleCell(c, { bold: true, fill });
            }
            totS += d.s; totI += d.i; totA += d.a;
        }

        for (const [offset, val] of [[0, totS], [1, totI], [2, totA]]) {
            const c = ws.getCell(dr, COL_TOT_S + offset);
            c.value = val;
            styleCell(c, { fill: rowBg });
        }
        const cT = ws.getCell(dr, COL_T);
        cT.value = totS + totI + totA;
        styleCell(cT, { fill: CLR.DGRAY });
    }

    //  Baris JUMLAH 
    const JUMLAH_ROW = DATA_START_ROW + siswas.length;
    ws.getRow(JUMLAH_ROW).height = 18;

    // Kolom A-D: label "JUMLAH"
    ws.mergeCells(JUMLAH_ROW, COL_A, JUMLAH_ROW, COL_D);
    const jCell = ws.getCell(JUMLAH_ROW, COL_A);
    jCell.value = "J U M L A H";
    styleCell(jCell, { bold: true, fill: CLR.GRAY, align: "center" });

    let grandS = 0, grandI = 0, grandA = 0;

    for (let bi = 0; bi < nBulan; bi++) {
        const bCol = COL_DATA_START + bi * 3;
        let sumS = 0, sumI = 0, sumA = 0;
        for (const [, bulanMap] of dataPerSiswa) {
            const d = bulanMap.get(bulanList[bi]) || { s: 0, i: 0, a: 0 };
            sumS += d.s; sumI += d.i; sumA += d.a;
        }
        grandS += sumS; grandI += sumI; grandA += sumA;

        for (const [offset, val] of [[0, sumS], [1, sumI], [2, sumA]]) {
            const c = ws.getCell(JUMLAH_ROW, bCol + offset);
            c.value = val;
            styleCell(c, { bold: true, fill: CLR.GRAY });
        }
    }

    for (const [offset, val] of [[0, grandS], [1, grandI], [2, grandA]]) {
        const c = ws.getCell(JUMLAH_ROW, COL_TOT_S + offset);
        c.value = val;
        styleCell(c, { bold: true, fill: CLR.GRAY });
    }
    const grandT = grandS + grandI + grandA;
    const jT = ws.getCell(JUMLAH_ROW, COL_T);
    jT.value = grandT;
    styleCell(jT, { bold: true, fill: CLR.GRAY });

    //  Ringkasan statistik 
    const STAT_ROW = JUMLAH_ROW + 2;
    const totalSiswaHari = siswas.length * jumlahHariEfektif;
    const statLabels = [
        ["Jumlah Ketidakhadiran", grandT],
        ["Jumlah Siswa", siswas.length],
        ["Presentase Ketidakhadiran", totalSiswaHari ? grandT / totalSiswaHari : 0],
        ["Jumlah Hari Efektif", jumlahHariEfektif],
        ["Presentase Kehadiran", totalSiswaHari ? (totalSiswaHari - grandT) / totalSiswaHari : 1],
    ];

    const statLabelCol = COL_TOT_S - 7;
    for (let i = 0; i < statLabels.length; i++) {
        const [label, val] = statLabels[i];
        const r = STAT_ROW + i;

        const lCell = ws.getCell(r, statLabelCol);
        lCell.value = label;
        lCell.font = { name: "Arial", size: 11 };
        lCell.alignment = { horizontal: "left" };
        ws.mergeCells(r, statLabelCol, r, COL_TOT_S - 1);

        const vCell = ws.getCell(r, COL_TOT_S);
        vCell.value = val;
        if (i === 2 || i === 4) vCell.numFmt = "0.00%";
        vCell.font = { name: "Arial", size: 11 };
        ws.mergeCells(r, COL_TOT_S, r, COL_T);
    }

    //  Tanda tangan 
    const TTD_ROW = STAT_ROW + statLabels.length + 2;
    const sigLabelStyle = { name: "Arial", size: 11 };

    ws.getCell(TTD_ROW, COL_C).value = "Mengetahui,";
    ws.getCell(TTD_ROW + 1, COL_C).value = `Kepala ${namaSekolah}`;
    ws.getCell(TTD_ROW, COL_TOT_S - 5).value = kotaTanggal;
    ws.getCell(TTD_ROW + 1, COL_TOT_S - 5).value = "Wali Kelas / Tingkat";

    [TTD_ROW, TTD_ROW + 1].forEach(r => {
        ws.getCell(r, COL_C).font = sigLabelStyle;
        ws.getCell(r, COL_TOT_S - 5).font = sigLabelStyle;
    });

    const SIG_ROW = TTD_ROW + 6;
    const kepsekCell = ws.getCell(SIG_ROW, COL_C);
    kepsekCell.value = kepsekNama;
    kepsekCell.font = { name: "Arial", bold: true, size: 11 };

    ws.getCell(SIG_ROW + 1, COL_C).value = kepsekNik;
    ws.getCell(SIG_ROW + 1, COL_C).font = sigLabelStyle;

    const waliCell = ws.getCell(SIG_ROW, COL_TOT_S - 5);
    waliCell.value = waliNama;
    waliCell.font = { name: "Arial", bold: true, size: 11 };

    ws.getCell(SIG_ROW + 1, COL_TOT_S - 5).value = waliNik;
    ws.getCell(SIG_ROW + 1, COL_TOT_S - 5).font = sigLabelStyle;

    ws.pageSetup = {
        paperSize: 9,       // A4
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
    };
}

// helper: ubah array record absensi menjadi Map<id_siswa, Map<bulan, {s,i,a}>>
function buildDataMap(records) {
    const map = new Map();
    for (const r of records) {
        if (!map.has(r.siswa_id)) map.set(r.siswa_id, new Map());
        const bulan = new Date(r.tanggal).getUTCMonth() + 1;
        const prev = map.get(r.siswa_id).get(bulan) || { s: 0, i: 0, a: 0 };
        map.get(r.siswa_id).set(bulan, {
            s: prev.s + (r.total_sakit || 0),
            i: prev.i + (r.total_izin || 0),
            a: prev.a + (r.total_alpha || 0),
        });
    }
    return map;
}

// helper: hitung jumlah hari efektif dalam 1 periode semester
function hitungHariEfektif(tglMulai, tglAkhir) {
    return Math.round((tglAkhir - tglMulai) / 86_400_000) + 1;
}

// ambil kelas beserta relasi yang dibutuhkan 
async function getKelasOrFail(kelas_id, res) {
    const kelas = await prisma.kelas.findFirst({
        where: { id: parseInt(kelas_id), deleted_at: null },
        include: {
            tahun: true,
            walas: { select: { nama: true, NIP: true } },
            siswa: {
                where: { deleted_at: null },
                select: { id: true, nama: true, NIPD: true, gender: true },
                orderBy: { nama: "asc" },
            },
        },
    });
    if (!kelas) {
        res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        return null;
    }
    return kelas;
}

// kiirim workbook ke response
async function sendWorkbook(res, wb, filename) {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
    );
    await wb.xlsx.write(res);
    res.end();
}


//   Ekspor rekap kelas bulanan

const exportRekapKelasMonthlyExcel = async (req, res) => {
    try {
        const { kelas_id, bulan, tahun } = req.query;
        if (!kelas_id || !bulan || !tahun)
            return res.status(400).json({ success: false, message: "kelas_id, bulan, dan tahun wajib diisi" });

        const bulanInt = parseInt(bulan);
        const tahunInt = parseInt(tahun);
        const tglMulai = new Date(Date.UTC(tahunInt, bulanInt - 1, 1));
        const tglAkhir = new Date(Date.UTC(tahunInt, bulanInt, 0));   // hari terakhir bulan

        if (bulanInt < 1 || bulanInt > 12)
            return res.status(400).json({ success: false, message: "Bulan tidak valid (1-12)" });

        const kelas = await getKelasOrFail(kelas_id, res);
        if (!kelas) return;

        const records = await prisma.finalAbsensi.findMany({
            where: { kelas_id: parseInt(kelas_id), deleted_at: null, tanggal: { gte: tglMulai, lte: tglAkhir } },
        });

        const wb = new ExcelJS.Workbook();
        wb.creator = "SMK Taruna Bhakti";
        const ws = wb.addWorksheet(`${kelas.kelas} ${kelas.jurusan}`);

        buildKelasSheet(ws, {
            namaKelas: `${kelas.kelas} ${kelas.jurusan}`,
            tahunAjaran: kelas.tahun.tahun_ajaran,

            // bulan 7-12 = Ganjil, bulan 1-6 = Genap
            semester: bulanInt >= 7 ? "GANJIL" : "GENAP",
            bulanList: [bulanInt],
            siswas: kelas.siswa,
            dataPerSiswa: buildDataMap(records),
            jumlahHariEfektif: hitungHariEfektif(tglMulai, tglAkhir),
            waliNama: kelas.walas?.nama ?? "",
            waliNik: kelas.walas?.NIP ?? "",
            kotaTanggal: `Depok, ${BULAN_ID[bulanInt - 1]} ${tahunInt}`,
        });

        await sendWorkbook(
            res, wb,
            `Rekap_${kelas.kelas}_${kelas.jurusan}_${BULAN_ID[bulanInt - 1]}_${tahunInt}.xlsx`,
        );
    } catch (err) {
        console.error("exportRekapKelasMonthlyExcel:", err);
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};


// Ekspor rekap kelas per semester

const exportRekapKelasSemesterExcel = async (req, res) => {
    try {
        const { kelas_id, tahun, semester } = req.query;
        if (!kelas_id || !tahun || !semester)
            return res.status(400).json({ success: false, message: "kelas_id, tahun, dan semester wajib diisi" });
        if (!["1", "2"].includes(semester))
            return res.status(400).json({ success: false, message: "Semester tidak valid (1 atau 2)" });

        const tahunInt = parseInt(tahun);
        const semInt = parseInt(semester);

        // tgl mulai & akhir berdasarkan semester (1=Ganjil: Juli-Des, 2=Genap: Jan-Jun)
        const tglMulai = semInt === 1
            ? new Date(Date.UTC(tahunInt, 6, 1))   // Juli
            : new Date(Date.UTC(tahunInt, 0, 1));  // Januari
        const tglAkhir = semInt === 1
            ? new Date(Date.UTC(tahunInt, 11, 31)) // Desember
            : new Date(Date.UTC(tahunInt, 5, 30)); // Juni
        const bulanRange = semInt === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];
        const semLabel = semInt === 1 ? "GANJIL" : "GENAP";

        const kelas = await getKelasOrFail(kelas_id, res);
        if (!kelas) return;

        const records = await prisma.finalAbsensi.findMany({
            where: { kelas_id: parseInt(kelas_id), deleted_at: null, tanggal: { gte: tglMulai, lte: tglAkhir } },
        });

        const wb = new ExcelJS.Workbook();
        wb.creator = "SMK Taruna Bhakti";
        const ws = wb.addWorksheet(`${kelas.kelas} ${kelas.jurusan} Sem${semInt}`);

        buildKelasSheet(ws, {
            namaKelas: `${kelas.kelas} ${kelas.jurusan}`,
            tahunAjaran: kelas.tahun.tahun_ajaran,
            semester: semLabel,
            bulanList: bulanRange,
            siswas: kelas.siswa,
            dataPerSiswa: buildDataMap(records),
            jumlahHariEfektif: hitungHariEfektif(tglMulai, tglAkhir),
            waliNama: kelas.walas?.nama ?? "",
            waliNik: kelas.walas?.NIP ?? "",
            kotaTanggal: `Depok, ${tahunInt}`,
        });

        await sendWorkbook(
            res, wb,
            `Rekap_${kelas.kelas}_${kelas.jurusan}_Semester${semInt}_${tahunInt}.xlsx`,
        );
    } catch (err) {
        console.error("exportRekapKelasSemesterExcel:", err);
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};


//  Ekspor rekap kelas tahunan (2 sheet: Ganjil & Genap)

const exportRekapKelasYearlyExcel = async (req, res) => {
    try {
        const { kelas_id, tahun } = req.query;
        if (!kelas_id || !tahun)
            return res.status(400).json({ success: false, message: "kelas_id dan tahun wajib diisi" });

        const tahunInt = parseInt(tahun);

        const kelas = await getKelasOrFail(kelas_id, res);
        if (!kelas) return;

        // Ambil semua record dalam satu query
        const tglMulai = new Date(Date.UTC(tahunInt, 0, 1));
        const tglAkhir = new Date(Date.UTC(tahunInt, 11, 31));

        const records = await prisma.finalAbsensi.findMany({
            where: { kelas_id: parseInt(kelas_id), deleted_at: null, tanggal: { gte: tglMulai, lte: tglAkhir } },
        });

        const dataPerSiswa = buildDataMap(records);

        // hitung hari efektif dari data aktual per semester 
        const tglGanjilMulai = new Date(Date.UTC(tahunInt, 6, 1));
        const tglGanjilAkhir = new Date(Date.UTC(tahunInt, 11, 31));
        const tglGenapMulai = new Date(Date.UTC(tahunInt, 0, 1));
        const tglGenapAkhir = new Date(Date.UTC(tahunInt, 5, 30));

        const wb = new ExcelJS.Workbook();
        wb.creator = "SMK Taruna Bhakti";

        const sheetBase = `${kelas.kelas} ${kelas.jurusan}`;

        const ws1 = wb.addWorksheet(`${sheetBase} Ganjil`);
        buildKelasSheet(ws1, {
            namaKelas: sheetBase,
            tahunAjaran: kelas.tahun.tahun_ajaran,
            semester: "GANJIL",
            bulanList: [7, 8, 9, 10, 11, 12],
            siswas: kelas.siswa,
            dataPerSiswa,
            jumlahHariEfektif: hitungHariEfektif(tglGanjilMulai, tglGanjilAkhir),
            waliNama: kelas.walas?.nama ?? "",
            waliNik: kelas.walas?.NIP ?? "",
            kotaTanggal: `Depok, ${tahunInt}`,
        });

        const ws2 = wb.addWorksheet(`${sheetBase} Genap`);
        buildKelasSheet(ws2, {
            namaKelas: sheetBase,
            tahunAjaran: kelas.tahun.tahun_ajaran,
            semester: "GENAP",
            bulanList: [1, 2, 3, 4, 5, 6],
            siswas: kelas.siswa,
            dataPerSiswa,
            jumlahHariEfektif: hitungHariEfektif(tglGenapMulai, tglGenapAkhir),
            waliNama: kelas.walas?.nama ?? "",
            waliNik: kelas.walas?.NIP ?? "",
            kotaTanggal: `Depok, ${tahunInt}`,
        });

        await sendWorkbook(
            res, wb,
            `Rekap_${kelas.kelas}_${kelas.jurusan}_${tahunInt}.xlsx`,
        );
    } catch (err) {
        console.error("exportRekapKelasYearlyExcel:", err);
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};


// Ekspor rekap harian kelas

const exportRekapKelasHarianExcel = async (req, res) => {
    try {
        const { kelas_id, tanggal } = req.query;
        if (!kelas_id || !tanggal)
            return res.status(400).json({ success: false, message: "kelas_id dan tanggal wajib diisi" });

        const targetDate = parseTanggal(tanggal);

        const kelas = await getKelasOrFail(kelas_id, res);
        if (!kelas) return;

        const records = await prisma.finalAbsensi.findMany({
            where: { kelas_id: parseInt(kelas_id), tanggal: targetDate, deleted_at: null },
        });

        const bulanHari = targetDate.getUTCMonth() + 1;
        const tahunHari = targetDate.getUTCFullYear();

        const wb = new ExcelJS.Workbook();
        wb.creator = "SMK Taruna Bhakti";
        const ws = wb.addWorksheet(`${kelas.kelas} ${kelas.jurusan}`);

        buildKelasSheet(ws, {
            namaKelas: `${kelas.kelas} ${kelas.jurusan}`,
            tahunAjaran: kelas.tahun.tahun_ajaran,
            semester: bulanHari >= 7 ? "GANJIL" : "GENAP",
            bulanList: [bulanHari],
            siswas: kelas.siswa,
            dataPerSiswa: buildDataMap(records),
            jumlahHariEfektif: 1,
            waliNama: kelas.walas?.nama ?? "",
            waliNik: kelas.walas?.NIP ?? "",
            kotaTanggal: `Depok, ${formatDate(targetDate)}`,
        });

        await sendWorkbook(
            res, wb,
            `Rekap_Harian_${kelas.kelas}_${kelas.jurusan}_${tanggal}.xlsx`,
        );
    } catch (err) {
        console.error("exportRekapKelasHarianExcel:", err);
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};


// Ekspor rekap per siswa (rentang tanggal bebas)

const exportRekapSiswaExcel = async (req, res) => {
    try {
        const { siswa_id, tanggal_mulai, tanggal_akhir } = req.query;
        if (!siswa_id)
            return res.status(400).json({ success: false, message: "siswa_id wajib diisi" });

        const records = await prisma.finalAbsensi.findMany({
            where: {
                siswa_id,
                deleted_at: null,
                tanggal: {
                    gte: tanggal_mulai ? parseTanggal(tanggal_mulai) : undefined,
                    lte: tanggal_akhir ? parseTanggal(tanggal_akhir) : undefined,
                },
            },
            include: {
                siswa: {
                    select: {
                        id: true, nama: true, NIPD: true, gender: true,
                        kelas: { include: { tahun: true, walas: { select: { nama: true, NIP: true } } } },
                    },
                },
            },
            orderBy: { tanggal: "asc" },
        });

        if (!records.length)
            return res.status(404).json({ success: false, message: "Data tidak ditemukan" });

        const siswa = records[0].siswa;
        //  kelas bisa null jika siswa belum assign
        const kelas = siswa.kelas ?? null;

        const bulanSet = new Set(records.map(r => new Date(r.tanggal).getUTCMonth() + 1));
        const bulanList = [...bulanSet].sort((a, b) => a - b);

        // Deteksi semester berdasarkan mayoritas bulan
        const semesterLabel = bulanList.some(b => b >= 7) ? "GANJIL" : "GENAP";

        const wb = new ExcelJS.Workbook();
        wb.creator = "SMK Taruna Bhakti";
        const ws = wb.addWorksheet("Rekap Siswa");

        buildKelasSheet(ws, {
            namaKelas: kelas ? `${kelas.kelas} ${kelas.jurusan}` : "-",
            tahunAjaran: kelas?.tahun?.tahun_ajaran ?? "-",
            semester: semesterLabel,
            bulanList,
            siswas: [{ id: siswa.id, nama: siswa.nama, NIPD: siswa.NIPD, gender: siswa.gender }],
            dataPerSiswa: buildDataMap(records),
            jumlahHariEfektif: records.length,
            waliNama: kelas?.walas?.nama ?? "",
            waliNik: kelas?.walas?.NIP ?? "",
            kotaTanggal: `Depok, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
        });

        const namaFile = siswa.nama.replace(/\s+/g, "_");
        await sendWorkbook(res, wb, `Rekap_Siswa_${namaFile}.xlsx`);
    } catch (err) {
        console.error("exportRekapSiswaExcel:", err);
        res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};

module.exports = {
    exportRekapKelasMonthlyExcel,
    exportRekapKelasSemesterExcel,
    exportRekapKelasYearlyExcel,
    exportRekapKelasHarianExcel,
    exportRekapSiswaExcel,
};