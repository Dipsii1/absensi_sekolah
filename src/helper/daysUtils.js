const VALID_HARI = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

const validateHari = (hari) => {
    if (!hari) return false;
    return VALID_HARI.includes(hari.toUpperCase());
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