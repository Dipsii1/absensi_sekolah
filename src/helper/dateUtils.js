// Format date + time ke string ID (dd/mm/yyyy HH:MM:SS)
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

// Format date ke string ID (dd/mm/yyyy)
const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Jakarta'
    });
};

// Format time ke HH:MM
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

// Ambil string tanggal hari ini dalam WIB "YYYY-MM-DD"
const getTodayStrWIB = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
};

// Harus pakai UTC midnight agar PostgreSQL simpan tanggal yang benar
const toDateOnly = (dateStr) => {
    return new Date(`${dateStr}T00:00:00.000Z`);
};

// Legacy - tetap dipertahankan agar tidak breaking perubahan di file lain
const getTodayWIB = () => {
    return toDateOnly(getTodayStrWIB());
};

// Legacy - tetap dipertahankan
const parseTanggal = (tanggalStr) => {
    return toDateOnly(tanggalStr);
};

// Untuk filter field @db.Timestamptz (tap_in, tap_out)
const getTanggalRangeWIB = (tanggalStr) => {
    const start = new Date(`${tanggalStr}T00:00:00.000+07:00`);
    const end   = new Date(`${tanggalStr}T23:59:59.999+07:00`);
    return { start, end };
};

// Waktu sekarang dalam WIB (timezone-safe, tidak bergantung timezone server)
const getNowWIB = () => {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
};

// Nomor minggu ISO dalam tahun
const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const validateTimeFormat = (time) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
};

module.exports = {
    formatDateTime,
    formatDate,
    formatTime,
    validateTimeFormat,
    getTodayStrWIB,
    toDateOnly,
    getTodayWIB,
    parseTanggal,
    getTanggalRangeWIB,
    getWeekNumber,
    getNowWIB,
};