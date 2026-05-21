const hitungStatusFinal = (counts) => {
    const prioritas = ["Alpha", "Sakit", "Izin", "Hadir"];
    const maxVal = Math.max(...Object.values(counts));
    const seri = prioritas.filter((status) => counts[status] === maxVal);
    return seri[0];
};

module.exports = {
    hitungStatusFinal
}