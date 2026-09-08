// Format date + time ke string ID (dd/mm/yyyy HH:MM:SS)
const WIB = 'Asia/Jakarta';

const formatDateTime = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: WIB
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
    const d = new Date(typeof time === 'string' ? time : time);
    if (Number.isNaN(d.getTime())) {
        // fallback: string time-only yang tidak bisa diparse (mis. "08:00")
        return typeof time === 'string' ? time.slice(0, 5) : null;
    }
    return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: WIB
    });
};

const formatJam = (val) => {
    if (!val) return null;
    // String "HH:MM" / "HH:MM:SS" — dukung jadwal bentuk string baru
    if (typeof val === 'string') {
        const m = val.match(/^(\d{1,2}):(\d{2})/);
        if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
        return val.slice(0, 5);
    }
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
};

// WIB time as "HH:MM" zero-padded — pakai untuk range query string-vs-string
const nowWibTimeString = () => {
    return new Date().toLocaleTimeString('en-GB', { timeZone: WIB, hour12: false }).slice(0, 5);
};

// String tanggal hari ini (WIB) dalam format en-CA "YYYY-MM-DD"
const _todayWIBDateStr = () => new Date().toLocaleDateString('en-CA', { timeZone: WIB });

const wibTodayAt = (time) => {
    let h, m;
    if (typeof time === 'string') {
        [h, m] = time.split(':').map(Number);
    } else {
        const d = new Date(time);
        h = d.getUTCHours();
        m = d.getUTCMinutes();
    }
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return new Date(`${_todayWIBDateStr()}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000+07:00`);
};

// Ambil string tanggal hari ini dalam WIB "YYYY-MM-DD"
const getTodayStrWIB = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: WIB });
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

// Waktu sekarang sebagai real UTC-instant.
// Pakai ini untuk dibandingkan dengan nilai @db.Timestamptz (tap_in/tap_out);
// tampilan pakai formatTime/formatDateTime (timeZone WIB).
const getNowWIB = () => new Date();

// Nomor minggu ISO dalam tahun (operasi pada UTC, karena input tanggal disimpan UTC-midnight = tanggal WIB)
const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
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
    formatJam,
    nowWibTimeString,
    wibTodayAt,
    validateTimeFormat,
    getTodayStrWIB,
    toDateOnly,
    getTodayWIB,
    parseTanggal,
    getTanggalRangeWIB,
    getWeekNumber,
    getNowWIB,
};