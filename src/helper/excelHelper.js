const COLORS = {
    header:    "1F4E79",
    subheader: "2E75B6",
    accent:    "D6E4F0",
    hadir:     "C6EFCE",
    alpha:     "FFDDC1",
    izin:      "FFF2CC",
    sakit:     "DDEBF7",
    white:     "FFFFFF",
    gray:      "F2F2F2",
};

const STATUS_COLOR = {
    HADIR: "C6EFCE",
    ALPHA: "FFDDC1",
    IZIN:  "FFF2CC",
    SAKIT: "DDEBF7",
};

function headerStyle(cell, bg = COLORS.header) {
    cell.font      = { bold: true, color: { argb: "FF" + COLORS.white }, name: "Arial", size: 11 };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border    = { top: thin(), bottom: thin(), left: thin(), right: thin() };
}

function dataStyle(cell, bg = COLORS.white, leftAlign = false) {
    cell.font      = { name: "Arial", size: 10 };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } };
    cell.alignment = { horizontal: leftAlign ? "left" : "center", vertical: "middle", wrapText: true };
    cell.border    = { top: hair(), bottom: hair(), left: hair(), right: hair() };
}

function thin(hex = "1A1A1A") {
    return { style: "thin", color: { argb: "FF" + hex } };
}

function hair() {
    return { style: "hair", color: { argb: "FFCCCCCC" } };
}

function titleRow(sheet, text, colCount, row = 1) {
    const cell     = sheet.getCell(row, 1);
    cell.value     = text;
    cell.font      = { bold: true, size: 13, color: { argb: "FF" + COLORS.header }, name: "Arial" };
    cell.alignment = { horizontal: "left", vertical: "middle" };
    sheet.mergeCells(row, 1, row, colCount);
    sheet.getRow(row).height = 24;
}

function subtitleRow(sheet, text, colCount, row = 2) {
    const cell     = sheet.getCell(row, 1);
    cell.value     = text;
    cell.font      = { italic: true, size: 10, color: { argb: "FF555555" }, name: "Arial" };
    cell.alignment = { horizontal: "left", vertical: "middle" };
    sheet.mergeCells(row, 1, row, colCount);
    sheet.getRow(row).height = 16;
}

function summaryBox(sheet, stats, startRow, startCol = 1) {
    const items = [
        ["Total",        stats.total_pertemuan ?? stats.total ?? 0, COLORS.gray],
        ["Hadir",        stats.hadir  ?? 0, COLORS.hadir],
        ["Izin",         stats.izin   ?? 0, COLORS.izin],
        ["Sakit",        stats.sakit  ?? 0, COLORS.sakit],
        ["Alpha",        stats.alpha  ?? 0, COLORS.alpha],
        ["% Kehadiran",  (stats.persentase_kehadiran ?? "0.00") + "%", COLORS.accent],
    ];
    items.forEach(([label, val, bg], i) => {
        const col  = startCol + i;
        const hdr  = sheet.getCell(startRow,     col);
        const data = sheet.getCell(startRow + 1, col);
        hdr.value  = label;
        data.value = val;
        headerStyle(hdr, COLORS.subheader);
        dataStyle(data, bg);
        const colDim = sheet.getColumn(col);
        colDim.width = Math.max(colDim.width || 0, 15);
    });
}

function hitungStatistik(arr) {
    const total = arr.length;
    const hadir = arr.filter(d => d.status === "HADIR").length;
    const izin  = arr.filter(d => d.status === "IZIN").length;
    const sakit = arr.filter(d => d.status === "SAKIT").length;
    const alpha = arr.filter(d => d.status === "ALPHA").length;
    return {
        total_pertemuan: total, hadir, izin, sakit, alpha,
        persentase_kehadiran: total > 0 ? ((hadir / total) * 100).toFixed(2) : "0.00",
    };
}

function sendExcel(res, wb, filename) {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return wb.xlsx.write(res).then(() => res.end());
}

function newWorkbook(ExcelJS) {
    const wb           = new ExcelJS.Workbook();
    wb.creator         = "Sistem Absensi Sekolah";
    wb.created         = new Date();
    wb.modified        = new Date();
    wb.properties.date1904 = false;
    return wb;
}

module.exports = {
    COLORS, STATUS_COLOR,
    headerStyle, dataStyle, titleRow, subtitleRow, summaryBox,
    hitungStatistik, sendExcel, newWorkbook,
};