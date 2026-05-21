const { parseTanggal, formatDate, formatDateTime } = require("../helper/indexUtils");
const {
  simpanFinalAbsensi,
  finalisasiAbsensiKelas,
  finalisasiSemuaKelasAktif,
  rekapFinalAbsensiKelas,
} = require("../services/finalAbsensi");

// Finalisasi 1 siswa secara manual
const finalisasiSiswa = async (req, res) => {
  try {
    const { siswa_id, kelas_id, tanggal } = req.body;

    if (!siswa_id || !kelas_id || !tanggal) {
      return res.status(400).json({
        success: false,
        message: "siswa_id, kelas_id, dan tanggal wajib diisi",
      });
    }

    const record = await simpanFinalAbsensi(
      siswa_id,
      parseInt(kelas_id),
      parseTanggal(tanggal)
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Tidak ada data absensi untuk siswa pada tanggal tersebut",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Final absensi siswa berhasil diproses",
      data: {
        siswa_id:     record.siswa_id,
        tanggal:      formatDate(record.tanggal),
        status_final: record.status_final,
        total_hadir:  record.total_hadir,
        total_izin:   record.total_izin,
        total_sakit:  record.total_sakit,
        total_alpha:  record.total_alpha,
        total_mapel:  record.total_mapel,
        finalized_at: formatDateTime(record.finalized_at),
      },
    });
  } catch (error) {
    console.error("[Controller] finalisasiSiswa:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

// Finalisasi seluruh siswa dalam 1 kelas
const finalisasiKelas = async (req, res) => {
  try {
    const kelas_id = parseInt(req.params.kelas_id);
    const { tanggal } = req.body;

    if (isNaN(kelas_id)) {
      return res.status(400).json({ success: false, message: "kelas_id tidak valid" });
    }

    if (!tanggal) {
      return res.status(400).json({ success: false, message: "tanggal wajib diisi" });
    }

    const hasil = await finalisasiAbsensiKelas(kelas_id, parseTanggal(tanggal));

    return res.status(200).json({
      success: true,
      message: "Finalisasi kelas selesai",
      data: {
        tanggal: formatDate(parseTanggal(tanggal)),
        ...hasil,
      },
    });
  } catch (error) {
    console.error("[Controller] finalisasiKelas:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

// Finalisasi semua kelas aktif
const finalisasiSemuaKelas = async (req, res) => {
  try {
    const { tanggal } = req.body;

    if (!tanggal) {
      return res.status(400).json({ success: false, message: "tanggal wajib diisi" });
    }

    const hasil = await finalisasiSemuaKelasAktif(parseTanggal(tanggal));

    return res.status(200).json({
      success: true,
      message: "Finalisasi semua kelas aktif selesai",
      data: {
        tanggal:      formatDate(parseTanggal(tanggal)),
        total_kelas:  hasil.length,
        rekap_kelas:  hasil,
      },
    });
  } catch (error) {
    console.error("[Controller] finalisasiSemuaKelas:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

module.exports = {
  finalisasiSiswa,
  finalisasiKelas,
  finalisasiSemuaKelas,
};