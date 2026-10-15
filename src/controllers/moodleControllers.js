const moodleRestCall = async (token, wsfunction, params = {}) => {
    const url = new URL(`${process.env.MOODLE_BASE_URL}/webservice/rest/server.php`);
    url.searchParams.set("wstoken", token);
    url.searchParams.set("wsfunction", wsfunction);
    url.searchParams.set("moodlewsrestformat", "json");

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    const data = await response.json();

    // Jika Moodle mengembalikan error, lempar exception agar bisa ditangani di controller
    if (data && data.exception) {
        throw new Error(`[${data.errorcode}] ${data.message}`);
    }

    return data;
};

// Helper: ambil moodle_token dari JWT yang sudah diverifikasi (req.user),
// bukan dari database — token Moodle memang sengaja tidak disimpan di DB.
const getSiswaMoodleToken = (req) => {
    const { siswa_id, moodle_token } = req.user || {};

    if (!siswa_id) {
        return { error: "Akun ini bukan akun siswa" };
    }

    if (!moodle_token) {
        return { error: "Sesi Moodle tidak ditemukan, silakan login ulang" };
    }

    return { siswa: { id: siswa_id, moodle_token } };
};

// GET /api/moodle/lms-url
// Generate link auto-login ke Moodle, dipakai tombol "Buka LMS"
const getLmsAutologinUrl = async (req, res) => {
    try {
        const { siswa, error } = getSiswaMoodleToken(req);

        if (error) {
            return res.status(401).json({ success: false, message: error });
        }

        const siteInfo = await moodleRestCall(siswa.moodle_token, "core_webservice_get_site_info");
        const autoLogin = await moodleRestCall(siswa.moodle_token, "tool_mobile_get_autologin_key");

        // Beberapa versi Moodle langsung mengembalikan "autologinurl",
        // versi lain cuma mengembalikan "key" dan URL harus disusun manual
        const targetPath = "/my/"; // halaman tujuan setelah auto-login, ganti sesuai kebutuhan
        const autologinUrl =
            autoLogin.autologinurl ||
            `${process.env.MOODLE_BASE_URL}/admin/tool/mobile/autologin.php?userid=${siteInfo.userid}&key=${autoLogin.key}&urltogo=${encodeURIComponent(process.env.MOODLE_BASE_URL + targetPath)}`;

        return res.status(200).json({
            success: true,
            data: { url: autologinUrl },
        });
    } catch (error) {
        console.error("Error in getLmsAutologinUrl:", error.message);
        return res.status(502).json({
            success: false,
            message: "Gagal membuat link auto-login LMS. Cek apakah 'Auto-login key expiry' sudah diaktifkan di Moodle.",
            error: error.message,
        });
    }
};

module.exports = {
    getLmsAutologinUrl,
};