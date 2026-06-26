const prisma = require("../config/prisma");
const { parseTanggal, formatDate, formatDateTime } = require("../helper/indexUtils");
const {
  simpanFinalAbsensi,
  finalisasiAbsensiKelas,
  finalisasiSemuaKelasAktif,
  rekapFinalAbsensiKelas,
} = require("../services/finalAbsensi");

const buildDateWhere = ({ tanggal, tanggal_mulai, tanggal_akhir }) => {
  if (tanggal) return { equals: parseTanggal(tanggal) };

  const dateWhere = {};
  if (tanggal_mulai) dateWhere.gte = parseTanggal(tanggal_mulai);
  if (tanggal_akhir) dateWhere.lte = parseTanggal(tanggal_akhir);
  return Object.keys(dateWhere).length ? dateWhere : undefined;
};

const formatFinalAbsensiRow = (siswa, record = null, fallbackTanggal = null) => ({
  siswa_id: siswa.id,
  nama: siswa.nama,
  NISN: siswa.NISN,
  NIPD: siswa.NIPD,
  kelas_id: siswa.kelas?.id ?? null,
  kelas: siswa.kelas
    ? {
        id: siswa.kelas.id,
        kelas: siswa.kelas.kelas,
        jurusan: siswa.kelas.jurusan,
        tahun_ajaran_id: siswa.kelas.tahun_ajaran_id,
        tahun: siswa.kelas.tahun,
      }
    : null,
  tanggal: record?.tanggal ? formatDate(record.tanggal) : fallbackTanggal,
  status_final: record?.status_final ?? null,
  total_hadir: record?.total_hadir ?? 0,
  total_izin: record?.total_izin ?? 0,
  total_sakit: record?.total_sakit ?? 0,
  total_alpha: record?.total_alpha ?? 0,
  total_mapel: record?.total_mapel ?? 0,
  is_finalized: record?.is_finalized ?? false,
  finalized_at: record?.finalized_at ? formatDateTime(record.finalized_at) : null,
});

const getFinalAbsensiFilters = async (req, res) => {
  try {
    const [kelasList, tahunList] = await Promise.all([
      prisma.kelas.findMany({
        where: { deleted_at: null },
        orderBy: [
          { tahun_ajaran_id: "desc" },
          { kelas: "asc" },
          { jurusan: "asc" },
        ],
        select: {
          id: true,
          kelas: true,
          jurusan: true,
          tahun_ajaran_id: true,
          tahun: {
            select: {
              id: true,
              tahun_ajaran: true,
              is_active: true,
            },
          },
        },
      }),
      prisma.tahun.findMany({
        where: { deleted_at: null },
        orderBy: [{ is_active: "desc" }, { created_at: "desc" }],
        select: {
          id: true,
          tahun_ajaran: true,
          tanggal_mulai: true,
          tanggal_selesai: true,
          is_active: true,
        },
      }),
    ]);

    const jurusan = Array.from(
      new Set(kelasList.map((item) => item.jurusan).filter(Boolean))
    ).sort();

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan filter final absensi",
      data: {
        kelas: kelasList,
        tahun_ajaran: tahunList,
        jurusan,
      },
    });
  } catch (error) {
    console.error("[Controller] getFinalAbsensiFilters:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

// List data final absensi untuk halaman export Pokja.
// Tetap mengambil siswa sebagai basis supaya siswa terdaftar tanpa final_absensi ikut tampil.
const getAllFinalAbsensi = async (req, res) => {
  try {
    const {
      tanggal,
      tanggal_mulai,
      tanggal_akhir,
      kelas_id,
      jurusan,
      tahun_ajaran_id,
      search,
    } = req.query;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 5000, 1), 10000);
    const skip = (page - 1) * limit;
    const dateWhere = buildDateWhere({ tanggal, tanggal_mulai, tanggal_akhir });

    const siswaWhere = {
      deleted_at: null,
    };

    if (kelas_id) siswaWhere.kelas_id = parseInt(kelas_id);

    const kelasWhere = {};
    if (jurusan) kelasWhere.jurusan = jurusan;
    if (tahun_ajaran_id) kelasWhere.tahun_ajaran_id = parseInt(tahun_ajaran_id);
    if (Object.keys(kelasWhere).length) {
      siswaWhere.kelas = {
        ...kelasWhere,
        deleted_at: null,
      };
    }

    if (search) {
      siswaWhere.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { NISN: { contains: search, mode: "insensitive" } },
        { NIPD: { contains: search, mode: "insensitive" } },
      ];
    }

    const [siswas, totalSiswa] = await Promise.all([
      prisma.siswa.findMany({
        where: siswaWhere,
        skip,
        take: limit,
        orderBy: [{ kelas_id: "asc" }, { nama: "asc" }],
        include: {
          kelas: {
            select: {
              id: true,
              kelas: true,
              jurusan: true,
              tahun_ajaran_id: true,
              tahun: {
                select: {
                  id: true,
                  tahun_ajaran: true,
                },
              },
            },
          },
          final_absensi: {
            where: {
              deleted_at: null,
              ...(dateWhere ? { tanggal: dateWhere } : {}),
              ...(kelas_id ? { kelas_id: parseInt(kelas_id) } : {}),
            },
            orderBy: { tanggal: "asc" },
          },
        },
      }),
      prisma.siswa.count({ where: siswaWhere }),
    ]);

    const fallbackTanggal = tanggal || null;
    const rows = siswas.flatMap((siswa) => {
      if (siswa.final_absensi.length === 0) {
        return [formatFinalAbsensiRow(siswa, null, fallbackTanggal)];
      }
      return siswa.final_absensi.map((record) => formatFinalAbsensiRow(siswa, record, fallbackTanggal));
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan data final absensi",
      data: rows,
      pagination: {
        total: totalSiswa,
        page,
        limit,
        totalPages: Math.ceil(totalSiswa / limit),
      },
    });
  } catch (error) {
    console.error("[Controller] getAllFinalAbsensi:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

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
  getFinalAbsensiFilters,
  getAllFinalAbsensi,
  finalisasiSiswa,
  finalisasiKelas,
  finalisasiSemuaKelas,
};
