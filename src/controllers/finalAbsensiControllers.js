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
  nisn: siswa.nisn,
  nipd: siswa.nipd,
  nik: siswa.nik,
  jenis_kelamin: siswa.jenis_kelamin,
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
  tanggal: record?.tanggal ? record.tanggal.toISOString().slice(0, 10) : fallbackTanggal,
  status_final: record?.status_final ?? null,
  total_hadir: record?.total_hadir ?? 0,
  total_izin: record?.total_izin ?? 0,
  total_sakit: record?.total_sakit ?? 0,
  total_alpha: record?.total_alpha ?? 0,
  total_mapel: record?.total_mapel ?? 0,
  is_finalized: record?.is_finalized ?? false,
  finalized_at: record?.finalized_at ? formatDateTime(record.finalized_at) : null,
});

const buildSiswaWhere = ({ kelas_id, jurusan, tahun_ajaran_id, search }) => {
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
      { nisn: { contains: search, mode: "insensitive" } },
      { nipd: { contains: search, mode: "insensitive" } },
      { nik: { contains: search, mode: "insensitive" } },
    ];
  }

  return siswaWhere;
};

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
// Generate all dates between start and end (inclusive)
const generateDatesRange = (startStr, endStr) => {
  const dates = [];
  const current = parseTanggal(startStr);
  const end = parseTanggal(endStr);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// Auto-finalize for dates that have no finalAbsensi records yet.
// Only finalizes dates that actually have absensiSiswa data (no point finalizing empty dates).
const autoFinalizeIfNeeded = async (dates) => {
  if (!dates.length) return;

  // Find which dates already have finalAbsensi records
  const existingDates = await prisma.finalAbsensi.groupBy({
    by: ["tanggal"],
    where: {
      tanggal: { in: dates },
      deleted_at: null,
    },
  });
  const existingSet = new Set(existingDates.map((d) => d.tanggal.toISOString()))

  // Find which dates actually have absensiSiswa data
  const datesWithAbsensi = await prisma.absensiSiswa.groupBy({
    by: ["tanggal"],
    where: {
      tanggal: { in: dates },
      deleted_at: null,
    },
  });
  const absensiSet = new Set(datesWithAbsensi.map((d) => d.tanggal.toISOString()))

  // Only finalize dates that have absensi data but no finalAbsensi records
  for (const date of dates) {
    const dateKey = date.toISOString();
    if (!existingSet.has(dateKey) && absensiSet.has(dateKey)) {
      console.log(`[Auto-Finalize] No finalAbsensi for ${dateKey.slice(0, 10)}, running finalization...`);
      try {
        await finalisasiSemuaKelasAktif(date);
      } catch (err) {
        console.error(`[Auto-Finalize] Failed for ${dateKey.slice(0, 10)}:`, err.message);
      }
    }
  }
};

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
      include_empty,
    } = req.query;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 5000, 1), 10000);
    const skip = (page - 1) * limit;
    const dateWhere = buildDateWhere({ tanggal, tanggal_mulai, tanggal_akhir });

    const siswaWhere = buildSiswaWhere({ kelas_id, jurusan, tahun_ajaran_id, search });
    const includeEmptyRows = include_empty !== "false";

    // Auto-finalize for queried dates that have no records yet
    if (dateWhere) {
      if (tanggal) {
        await autoFinalizeIfNeeded([parseTanggal(tanggal)]);
      } else if (tanggal_mulai && tanggal_akhir) {
        const dates = generateDatesRange(tanggal_mulai, tanggal_akhir);
        // Limit to 31 days to prevent abuse
        await autoFinalizeIfNeeded(dates.slice(0, 31));
      }
    }

    if (!includeEmptyRows) {
      const finalAbsensiWhere = {
        deleted_at: null,
        ...(dateWhere ? { tanggal: dateWhere } : {}),
        ...(kelas_id ? { kelas_id: parseInt(kelas_id) } : {}),
        siswa: siswaWhere,
      };

      const [records, totalRecords] = await Promise.all([
        prisma.finalAbsensi.findMany({
          where: finalAbsensiWhere,
          skip,
          take: limit,
          orderBy: [{ tanggal: "asc" }, { kelas_id: "asc" }, { siswa: { nama: "asc" } }],
          include: {
            siswa: {
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
              },
            },
          },
        }),
        prisma.finalAbsensi.count({ where: finalAbsensiWhere }),
      ]);

      return res.status(200).json({
        success: true,
        message: "Berhasil mendapatkan data final absensi",
        data: records.map((record) => formatFinalAbsensiRow(record.siswa, record)),
        pagination: {
          total: totalRecords,
          page,
          limit,
          totalPages: Math.ceil(totalRecords / limit),
        },
      });
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
        siswa_id: record.siswa_id,
        tanggal: formatDate(record.tanggal),
        status_final: record.status_final,
        total_hadir: record.total_hadir,
        total_izin: record.total_izin,
        total_sakit: record.total_sakit,
        total_alpha: record.total_alpha,
        total_mapel: record.total_mapel,
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
        tanggal: formatDate(parseTanggal(tanggal)),
        total_kelas: hasil.length,
        rekap_kelas: hasil,
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

// finalisasi semua siswa aktif (Admin) - siswa yang belum tap in akan berstatus Alpha
const finalisasiSemuaSiswa = async (req, res) => {
  try {
    const { tanggal } = req.body;

    if (!tanggal) {
      return res.status(400).json({ success: false, message: "tanggal wajib diisi" });
    }

    const tanggalParsed = parseTanggal(tanggal);

    // Ambil semua siswa aktif yang memiliki kelas_id
    const siswaList = await prisma.siswa.findMany({
      where: {
        status_siswa: "Active",
        deleted_at: null,
        kelas_id: { not: null },
      },
      select: {
        id: true,
        kelas_id: true,
      },
    });

    if (siswaList.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Tidak ada siswa aktif ditemukan",
        data: {
          tanggal: formatDate(tanggalParsed),
          total_siswa: 0,
          berhasil: 0,
          gagal: 0,
          detail_gagal: [],
        },
      });
    }

    let berhasil = 0;
    let gagal = 0;
    const detailGagal = [];

    for (const siswa of siswaList) {
      try {
        const record = await simpanFinalAbsensi(
          siswa.id,
          siswa.kelas_id,
          tanggalParsed
        );

        if (record) {
          berhasil++;
        } else {
          gagal++;
          detailGagal.push({
            siswa_id: siswa.id,
            alasan: "Gagal memproses final absensi",
          });
        }
      } catch (err) {
        gagal++;
        detailGagal.push({
          siswa_id: siswa.id,
          alasan: err.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Finalisasi seluruh siswa selesai",
      data: {
        tanggal: formatDate(tanggalParsed),
        total_siswa: siswaList.length,
        berhasil,
        gagal,
        detail_gagal: detailGagal,
      },
    });
  } catch (error) {
    console.error("[Controller] finalisasiSemuaSiswa:", error);
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
  finalisasiSemuaSiswa,
};
