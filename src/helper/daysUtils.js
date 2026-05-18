const VALID_HARI = ['MINGGU', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

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