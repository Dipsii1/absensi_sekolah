const hitungStatusFinal = (counts) => {
    const prioritas = ["Alpha", "Sakit", "Izin", "Hadir"];
    const maxVal = Math.max(...Object.values(counts));
    const seri = prioritas.filter((status) => counts[status] === maxVal);
    return seri[0];
};

const hitungStatistikFinal = (records) => {
    const total = records.length;
    const Hadir = records.filter((r) => r.status_final === "Hadir").length;
    const Izin  = records.filter((r) => r.status_final === "Izin").length;
    const Sakit = records.filter((r) => r.status_final === "Sakit").length;
    const Alpha = records.filter((r) => r.status_final === "Alpha").length;
    return {
        total_hari: total,
        Hadir, Izin, Sakit, Alpha,
        persentase_kehadiran: total > 0 ? ((Hadir / total) * 100).toFixed(2) : "0.00"
    };
};

module.exports = {
    hitungStatusFinal,
    hitungStatistikFinal
}