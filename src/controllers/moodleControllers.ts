import { Request, Response } from "express";

interface MoodleData {
    exception?: string;
    errorcode?: string;
    message?: string;
    [key: string]: unknown;
}

const moodleRestCall = async (token: string, wsfunction: string, params: Record<string, string> = {}): Promise<MoodleData> => {
    const url = new URL(`${process.env.MOODLE_BASE_URL}/webservice/rest/server.php`);
    url.searchParams.set("wstoken", token);
    url.searchParams.set("wsfunction", wsfunction);
    url.searchParams.set("moodlewsrestformat", "json");

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    const data = (await response.json()) as MoodleData;

    // Jika Moodle mengembalikan error, lempar exception agar bisa ditangani di controller
    if (data && data.exception) {
        throw new Error(`[${data.errorcode}] ${data.message}`);
    }

    return data;
};

// Helper: ambil moodle_token dari JWT yang sudah diverifikasi (req.user),
// bukan dari database — token Moodle memang sengaja tidak disimpan di DB.
const getSiswaMoodleToken = (req: Request): { siswa: { id: string; moodle_token: string } } | { error: string } => {
    const siswa_id = req.user?.siswa_id ?? null;
    const moodle_token: string | null = (req.user as { moodle_token?: string | null })?.moodle_token ?? null;

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
export const getLmsAutologinUrl = async (req: Request, res: Response) => {
    try {
        const tokenResult = getSiswaMoodleToken(req);
        if ("error" in tokenResult) {
            return res.status(401).json({ success: false, message: tokenResult.error });
        }
        const siswa = tokenResult.siswa;

        const siteInfo = await moodleRestCall(siswa.moodle_token, "core_webservice_get_site_info");
        const autoLogin = await moodleRestCall(siswa.moodle_token, "tool_mobile_get_autologin_key");

        // Beberapa versi Moodle langsung mengembalikan "autologinurl",
        // versi lain cuma mengembalikan "key" dan URL harus disusun manual
        const targetPath = "/my/"; // halaman tujuan setelah auto-login, ganti sesuai kebutuhan
        const autologinUrl =
            (autoLogin.autologinurl as string | undefined) ||
            `${process.env.MOODLE_BASE_URL}/admin/tool/mobile/autologin.php?userid=${(siteInfo as { userid?: string | number }).userid}&key=${autoLogin.key as string}&urltogo=${encodeURIComponent(String(process.env.MOODLE_BASE_URL) + targetPath)}`;

        return res.status(200).json({
            success: true,
            data: { url: autologinUrl },
        });
    } catch (error) {
        console.error("Error in getLmsAutologinUrl:", error instanceof Error ? error.message : String(error));
        return res.status(502).json({
            success: false,
            message: "Gagal membuat link auto-login LMS. Cek apakah 'Auto-login key expiry' sudah diaktifkan di Moodle.",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
