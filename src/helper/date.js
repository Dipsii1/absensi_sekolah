// format tanggal dan waktu ke dalam format Indonesia
const formatDateTime = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta'
    });
};

const formatDate = (date) => {
    if (!date) return null;
    return new Date(time).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    });
};

const formatTime = (time) => {
    if (!time) return null;
    if (typeof time === 'string') {
        return time.substring(0, 5);
    }
    return new Date(time).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta'
    });
};

// get hari untuk validasi hari untuk tapin absensi
const VALID_HARI = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

const validateHari = (hari) => {
    if (!hari) return false;
    return VALID_HARI.includes(hari.toUpperCase());
};

const getHariFromDate = (date) => {
    const wibDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return VALID_HARI[wibDate.getDay()];
};

const validateTimeFormat = (time) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
};

// Ambil tanggal hari ini sebagai midnight UTC (WIB-safe)
const getTodayWIB = () => {
    const wibStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    return new Date(`${wibStr}T00:00:00.000Z`);
};

// Parse string tanggal "YYYY-MM-DD" dari query ke Date midnight UTC (WIB-safe)
const parseTanggal = (tanggalStr) => {
    return new Date(`${tanggalStr}T00:00:00.000Z`);
};

module.exports = {
    formatDateTime,
    formatDate,
    formatTime,
    validateTimeFormat,
    validateHari,
    getTodayWIB,
    parseTanggal,
};