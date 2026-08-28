const VALID_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const WIB = 'Asia/Jakarta';
const _wibWeekday = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: WIB });

const validateHari = (hari) => {
    if (!hari) return false;
    // Normalisasi ke Title Case sebelum cek
    const normalized = hari.charAt(0).toUpperCase() + hari.slice(1).toLowerCase();
    return VALID_HARI.includes(normalized);
};

// Nama hari dalam WIB, timezone-agnostic (gunakan Intl, tidak bergantung process.tz).
const getHariFromDate = (date) => {
    if (!date) return null;
    return _wibWeekday.format(new Date(date));
};

module.exports = {
    VALID_HARI,
    validateHari,
    getHariFromDate,
};