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
    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Jakarta'
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

const validateTimeFormat = (time) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
};

// Ambil tanggal hari ini sebagai midnight WIB (bukan UTC)
const getTodayWIB = () => {
    const wibStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    return new Date(`${wibStr}T00:00:00.000+07:00`);
};

// Parse string tanggal "YYYY-MM-DD" ke Date midnight WIB (bukan UTC)
const parseTanggal = (tanggalStr) => {
    return new Date(`${tanggalStr}T00:00:00.000+07:00`);
};

// Ambil range start–end untuk satu hari penuh dalam WIB
// Gunakan ini saat filter tap_in di database
const getTanggalRangeWIB = (tanggalStr) => {
    const start = new Date(`${tanggalStr}T00:00:00.000+07:00`);
    const end   = new Date(`${tanggalStr}T23:59:59.999+07:00`);
    return { start, end };
};

module.exports = {
    formatDateTime,
    formatDate,
    formatTime,
    validateTimeFormat,
    validateHari,
    getHariFromDate,
    getTodayWIB,
    parseTanggal,
    getTanggalRangeWIB,
};