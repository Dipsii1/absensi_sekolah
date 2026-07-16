const prisma = require("../config/prisma");
const { hitungStatusFinal } = require("../helper/helperFinalAbsensi")

// Core: Hitung Final Absensi untuk 1 Siswa di 1 Hari
const hitungFinalAbsensiSiswa = async (siswa_id, tanggal) => {
    const absensiHarian = await prisma.absensiSiswa.findFirst({
        where: {
            siswa_id,
            tanggal,
            deleted_at: null,
        },
        include: {
            detail: {
                where: { deleted_at: null },
                select: { status: true },
            },
        },
    });

    if (!absensiHarian) return null;

    const counts = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };

    // Kasus tanpa detail mapel: hari tanpa jadwal (pulang cepat, event sekolah),
    // atau belum ada guru yang input absensi. Fallback ke status_harian.
    if (absensiHarian.detail.length === 0) {
        if (!absensiHarian.status_harian) return null;  // benar-benar tidak ada data sama sekali
        if (counts[absensiHarian.status_harian] === undefined) return null;

        counts[absensiHarian.status_harian] = 1;

        return {
            siswa_id,
            tanggal,
            status_final: hitungStatusFinal(counts),
            counts,
            total_mapel: 0,
        };
    }

    for (const detail of absensiHarian.detail) {
        if (counts[detail.status] !== undefined) counts[detail.status]++;
    }

    const total_mapel = absensiHarian.detail.length;
    const status_final = hitungStatusFinal(counts);

    return { siswa_id, tanggal, status_final, counts, total_mapel };
};

// Core: Simpan / Update FinalAbsensi ke DB (upsert)
const simpanFinalAbsensi = async (siswa_id, kelas_id, tanggal) => {
    const hasil = await hitungFinalAbsensiSiswa(siswa_id, tanggal);

    if (!hasil) {
        console.warn(
            `[FinalAbsensi] Tidak ada data absensi untuk siswa ${siswa_id} pada ${tanggal.toISOString().slice(0, 10)}`
        );
        return null;
    }

    const record = await prisma.finalAbsensi.upsert({
        where: { siswa_id_tanggal: { siswa_id, tanggal } },
        create: {
            siswa_id,
            kelas_id,
            tanggal,
            status_final: hasil.status_final,
            total_hadir: hasil.counts.Hadir,
            total_izin: hasil.counts.Izin,
            total_sakit: hasil.counts.Sakit,
            total_alpha: hasil.counts.Alpha,
            total_mapel: hasil.total_mapel,
            is_finalized: true,
            finalized_at: new Date(),
        },
        update: {
            status_final: hasil.status_final,
            total_hadir: hasil.counts.Hadir,
            total_izin: hasil.counts.Izin,
            total_sakit: hasil.counts.Sakit,
            total_alpha: hasil.counts.Alpha,
            total_mapel: hasil.total_mapel,
            is_finalized: true,
            finalized_at: new Date(),
        },
    });

    console.log(
        `[FinalAbsensi] Siswa ${siswa_id} | ${tanggal.toISOString().slice(0, 10)} → ${hasil.status_final} ` +
        `(${hasil.counts.Hadir}H ${hasil.counts.Izin}I ${hasil.counts.Sakit}S ${hasil.counts.Alpha}A)`
    );

    return record;
};

// Bulk: Finalisasi Seluruh Siswa dalam 1 Kelas
const finalisasiAbsensiKelas = async (kelas_id, tanggal) => {
    const siswaDiKelas = await prisma.siswa.findMany({
        where: { kelas_id, status_siswa: "Active", deleted_at: null },
        select: { id: true, nama: true },
    });

    let berhasil = 0, gagal = 0, dilewati = 0;

    for (const siswa of siswaDiKelas) {
        try {
            const hasil = await hitungFinalAbsensiSiswa(siswa.id, tanggal);
            if (!hasil) { dilewati++; continue; }
            await simpanFinalAbsensi(siswa.id, kelas_id, tanggal);
            berhasil++;
        } catch (error) {
            console.error(`[FinalAbsensi] Gagal memproses siswa ${siswa.nama} (${siswa.id}):`, error);
            gagal++;
        }
    }

    console.log(
        `[FinalAbsensi] Kelas ${kelas_id} | ${tanggal.toISOString().slice(0, 10)} ` +
        `→ Berhasil: ${berhasil}, Gagal: ${gagal}, Dilewati: ${dilewati}`
    );

    return { berhasil, gagal, dilewati };
};

// Bulk: Finalisasi Semua Kelas Aktif
const finalisasiSemuaKelasAktif = async (tanggal) => {
    const kelasAktif = await prisma.kelas.findMany({
        where: { status_kelas: "Active", deleted_at: null, tahun: { is_active: true } },
        select: { id: true, kelas: true, jurusan: true },
    });

    console.log(`[FinalAbsensi] Memulai finalisasi ${kelasAktif.length} kelas aktif...`);

    const hasil = [];
    for (const kelas of kelasAktif) {
        console.log(`[FinalAbsensi] Memproses kelas ${kelas.kelas} ${kelas.jurusan}...`);
        const rekap = await finalisasiAbsensiKelas(kelas.id, tanggal);
        hasil.push({ kelas_id: kelas.id, nama: `${kelas.kelas} ${kelas.jurusan}`, ...rekap });
    }

    console.log(`[FinalAbsensi] Selesai.`);
    return hasil;
};
module.exports = {
    hitungStatusFinal,
    hitungFinalAbsensiSiswa,
    simpanFinalAbsensi,
    finalisasiAbsensiKelas,
    finalisasiSemuaKelasAktif,
};