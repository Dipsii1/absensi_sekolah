const prisma = require("../config/prisma");
const { parseTanggal } = require("./dateUtils");
const { simpanFinalAbsensi } = require("../services/finalAbsensi");

const applyStatusChange = async (siswa_id, kelas_id, tanggal, walas_id, status_baru, keterangan) => {
    const walasId = parseInt(walas_id);
    const targetDate = parseTanggal(typeof tanggal === "string" ? tanggal : tanggal.toISOString().slice(0, 10));

    // Cari absensi siswa untuk tanggal tersebut
    let absensi = await prisma.absensiSiswa.findFirst({
        where: { siswa_id, tanggal: targetDate, deleted_at: null },
        include: {
            detail: {
                where: { jadwal_id: null, guru_id: walasId, deleted_at: null }
            }
        }
    });

    if (!absensi) {
        absensi = await prisma.absensiSiswa.create({
            data: {
                siswa_id,
                tanggal: targetDate,
                tap_in: null,
                tap_out: null,
                status_tapin: null,
                rfid_id: null,
                status_harian: status_baru  // langsung set saat create
            },
            include: {
                detail: {
                    where: { jadwal_id: null, guru_id: walasId, deleted_at: null }
                }
            }
        });
    }

    const existingDetail = absensi.detail?.[0] ?? null;

    if (existingDetail) {
        await prisma.detailAbsensiSiswa.update({
            where: { id: existingDetail.id },
            data: { status: status_baru, keterangan: keterangan ?? null }
        });
    } else {
        await prisma.detailAbsensiSiswa.create({
            data: {
                absensi_id: absensi.id,
                jadwal_id: null,
                guru_id: walasId,
                status: status_baru,
                keterangan: keterangan ?? null,
                jam_absen: new Date()
            }
        });
    }

    // Selalu sync status_harian ke status terbaru dari walas
    await prisma.absensiSiswa.update({
        where: { id: absensi.id },
        data: { status_harian: status_baru }
    });

    // Update FinalAbsensi agar dashboard/export tersinkronisasi
    if (kelas_id) {
        await simpanFinalAbsensi(siswa_id, parseInt(kelas_id), targetDate);
    }
};

module.exports = { applyStatusChange };