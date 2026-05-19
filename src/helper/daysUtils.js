const VALID_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const validateHari = (hari) => {
    if (!hari) return false;
    // Normalisasi ke Title Case sebelum cek
    const normalized = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();
    return VALID_HARI.includes(normalized);
};

const getHariFromDate = (date) => {
    if (!date) return null;
    const wibDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return VALID_HARI[wibDate.getDay()];
};

module.exports = {
    VALID_HARI,
    validateHari,
    getHariFromDate,
};