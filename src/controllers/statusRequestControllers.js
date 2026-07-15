const prisma = require("../config/prisma");
const { StatusAbsensi } = require("@prisma/client");
const { parseTanggal, formatDate } = require("../helper/dateUtils");
const { applyStatusChange } = require("../helper/reqStatusAbsensi"); // ← import yang benar

const EXPIRY_MINUTES = 15;

// GURU mengajukan permintaan perubahan status siswa
const createRequest = async (req, res) => {
    try {
        const { guru_id, siswa_id, kelas_id, tanggal, status_baru, keterangan } = req.body;

        if (!guru_id || !siswa_id || !kelas_id || !tanggal || !status_baru) {
            return res.status(400).json({
                success: false,
                message: "guru_id, siswa_id, kelas_id, tanggal, dan status_baru wajib diisi"
            });
        }

        if (!Object.values(StatusAbsensi).includes(status_baru)) {
            return res.status(400).json({
                success: false,
                message: "status_baru tidak valid. Gunakan: Hadir, Izin, Sakit, atau Alpha"
            });
        }

        // Cari kelas dan walas_id-nya
        const kelas = await prisma.kelas.findFirst({
            where: { id: parseInt(kelas_id), deleted_at: null },
            select: { id: true, walas_id: true }
        });

        if (!kelas) {
            return res.status(404).json({ success: false, message: "Kelas tidak ditemukan" });
        }

        if (!kelas.walas_id) {
            return res.status(422).json({
                success: false,
                message: "Kelas ini belum memiliki wali kelas. Status tidak dapat dimintakan persetujuan."
            });
        }

        const targetDate = parseTanggal(tanggal);

        // Ambil status_lama dari status_harian (sumber kebenaran tunggal)
        const existingAbsensi = await prisma.absensiSiswa.findFirst({
            where: { siswa_id, tanggal: targetDate, deleted_at: null },
            select: { status_harian: true }
        });
        const status_lama = existingAbsensi?.status_harian ?? null;

        const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

        // Upsert: jika sudah ada permintaan pending untuk siswa+tanggal yang sama, update saja
        const existing = await prisma.permintaanStatusAbsensi.findFirst({
            where: { siswa_id, tanggal: targetDate, is_pending: true }
        });

        let permintaan;
        if (existing) {
            permintaan = await prisma.permintaanStatusAbsensi.update({
                where: { id: existing.id },
                data: {
                    guru_id: parseInt(guru_id),
                    walas_id: kelas.walas_id,
                    status_lama,
                    status_baru,
                    keterangan: keterangan ?? null,
                    expires_at: expiresAt,
                    is_pending: true,
                    is_approved: false,
                    is_auto_approved: false
                }
            });
        } else {
            permintaan = await prisma.permintaanStatusAbsensi.create({
                data: {
                    siswa_id,
                    kelas_id: parseInt(kelas_id),
                    guru_id: parseInt(guru_id),
                    walas_id: kelas.walas_id,
                    tanggal: targetDate,
                    status_lama,
                    status_baru,
                    keterangan: keterangan ?? null,
                    is_pending: true,
                    is_approved: false,
                    is_auto_approved: false,
                    expires_at: expiresAt
                }
            });
        }

        return res.status(201).json({
            success: true,
            message: "Permintaan perubahan status berhasil dikirim ke wali kelas",
            data: {
                id: permintaan.id,
                status_lama,
                status_baru,
                expires_at: expiresAt,
                auto_approve_in_minutes: EXPIRY_MINUTES
            }
        });

    } catch (error) {
        console.error("Error in createRequest:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server", error: error.message });
    }
};

// WALAS mengambil semua permintaan pending milik kelasnya
const getPendingRequests = async (req, res) => {
    try {
        const { walas_id, kelas_id } = req.query;

        if (!walas_id) {
            return res.status(400).json({ success: false, message: "walas_id wajib diisi" });
        }

        const where = {
            walas_id: parseInt(walas_id),
            is_pending: true
        };
        if (kelas_id) where.kelas_id = parseInt(kelas_id);

        const permintaan = await prisma.permintaanStatusAbsensi.findMany({
            where,
            include: {
                siswa: { select: { id: true, nama: true, NISN: true, NIK: true } },
                guru:  { select: { id: true, nama: true } },
                kelas: { select: { id: true, kelas: true, jurusan: true } }
            },
            orderBy: { expires_at: "asc" }
        });

        return res.json({
            success: true,
            message: "Berhasil mengambil permintaan pending",
            data: permintaan.map((p) => ({
                id: p.id,
                siswa: p.siswa,
                guru: p.guru,
                kelas: p.kelas,
                tanggal: formatDate(p.tanggal),
                status_lama: p.status_lama,
                status_baru: p.status_baru,
                keterangan: p.keterangan,
                expires_at: p.expires_at,
                created_at: p.created_at
            }))
        });

    } catch (error) {
        console.error("Error in getPendingRequests:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server", error: error.message });
    }
};

// WALAS menyetujui atau menolak permintaan
const respondRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { approved, keterangan } = req.body;

        if (approved === undefined) {
            return res.status(400).json({ success: false, message: "approved (boolean) wajib diisi" });
        }

        const permintaan = await prisma.permintaanStatusAbsensi.findFirst({
            where: { id: parseInt(id), is_pending: true }
        });

        if (!permintaan) {
            return res.status(404).json({ success: false, message: "Permintaan tidak ditemukan atau sudah diproses" });
        }

        if (approved) {
            await applyStatusChange(
                permintaan.siswa_id,
                permintaan.kelas_id,
                permintaan.tanggal,
                permintaan.walas_id,
                permintaan.status_baru,
                keterangan ?? permintaan.keterangan
            );
        }

        await prisma.permintaanStatusAbsensi.update({
            where: { id: parseInt(id) },
            data: {
                is_pending: false,
                is_approved: !!approved,
                is_auto_approved: false,
                keterangan: keterangan ?? permintaan.keterangan
            }
        });

        return res.json({
            success: true,
            message: approved
                ? "Permintaan disetujui dan status siswa telah diperbarui"
                : "Permintaan ditolak",
            data: { id: parseInt(id), approved: !!approved }
        });

    } catch (error) {
        console.error("Error in respondRequest:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server", error: error.message });
    }
};

// ─── Internal: auto-approve expired requests (used by cron) ──────────────
const autoApproveExpired = async () => {
    const now = new Date(); // UTC — konsisten dengan expires_at yang di-set pakai Date.now()
    const expired = await prisma.permintaanStatusAbsensi.findMany({
        where: { is_pending: true, expires_at: { lte: now } }
    });

    if (expired.length === 0) return 0;

    let approved = 0;
    for (const p of expired) {
        try {
            await applyStatusChange(
                p.siswa_id,
                p.kelas_id,
                p.tanggal,
                p.walas_id,
                p.status_baru,
                p.keterangan
            );
            await prisma.permintaanStatusAbsensi.update({
                where: { id: p.id },
                data: { is_pending: false, is_approved: true, is_auto_approved: true }
            });
            approved++;
        } catch (err) {
            console.error(`[AutoApprove] Gagal untuk permintaan id=${p.id}:`, err.message);
        }
    }

    return approved;
};

module.exports = { 
    createRequest, 
    getPendingRequests, 
    respondRequest, 
    autoApproveExpired 
};