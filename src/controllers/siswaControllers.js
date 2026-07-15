const prisma = require("../config/prisma");
const path = require("path");
const xlsx = require("xlsx");

// get all siswa 
const getAllSiswa = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { kelas_id, walas_id } = req.query;

        const whereCondition = {
            deleted_at: null
        };

        if (kelas_id) {
            whereCondition.kelas_id = parseInt(kelas_id);
        }

        if (walas_id) {
            whereCondition.kelas = {
                walas_id: parseInt(walas_id),
                deleted_at: null
            };
        }

        const [data, total] = await Promise.all([
            prisma.siswa.findMany({
                where: whereCondition,
                skip,
                take: limit,
                orderBy: {
                    created_at: "asc"
                },
                include: {
                    orang_tua: {
                        select: {
                            id: true,
                            nama_orangtua: true,
                            nomor_telepon: true
                        }
                    },
                    kelas: {
                        select: {
                            id: true,
                            kelas: true,
                            jurusan: true,
                            tahun: {
                                select: {
                                    tahun_ajaran: true
                                }
                            }
                        }
                    },
                    rfid: {
                        where: {
                            deleted_at: null,
                            is_active: true
                        },
                        select: {
                            id: true,
                            uid_rfid: true,
                            is_active: true
                        }
                    }
                }
            }),
            prisma.siswa.count({
                where: whereCondition
            })
        ]);

        return res.json({
            success: true,
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error in getAllSiswa:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};
// get siswa by ID
const getSiswaById = async (req, res) => {
    try {
        const { id } = req.params;

        const siswa = await prisma.siswa.findFirst({
            where: {
                id,
                deleted_at: null
            },
            include: {
                orang_tua: {
                    select: {
                        id: true,
                        nama_orangtua: true,
                        nomor_telepon: true
                    }
                },
                kelas: {
                    select: {
                        id: true,
                        kelas: true,
                        jurusan: true,
                        tahun: {
                            select: {
                                tahun_ajaran: true
                            }
                        }
                    }
                },
                rfid: {
                    where: {
                        deleted_at: null,
                        is_active: true
                    },
                    select: {
                        id: true,
                        uid_rfid: true,
                        is_active: true
                    }
                }
            }
        });

        if (!siswa) {
            return res.status(404).json({
                success: false,
                message: "Siswa tidak ditemukan"
            });
        }

        return res.json({
            success: true,
            data: siswa
        });

    } catch (error) {
        console.error("Error in getSiswaById:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            message: error.message
        });
    }
};

// create data siswa 
const createSiswa = async (req, res) => {
    try {
        const {
            NISN,
            NIPD,
            NIK,
            nama,
            alamat,
            gender,
            tanggal_lahir,
            nomor_telepon,
            nama_kelas,
            jurusan,
            orangtua
        } = req.body;

        // Validasi input wajib siswa
        if (!NISN || !NIPD || !NIK || !nama || !alamat || !gender || !tanggal_lahir || !nomor_telepon || !nama_kelas || !jurusan) {
            return res.status(400).json({
                success: false,
                message: "Semua field siswa wajib diisi"
            });
        }

        // Validasi NISN, NIPD & NIK harus angka
        if (!/^\d+$/.test(NISN)) {
            return res.status(400).json({ success: false, message: "NISN harus berupa angka" });
        }
        if (!/^\d+$/.test(NIPD)) {
            return res.status(400).json({ success: false, message: "NIPD harus berupa angka" });
        }
        if (!/^\d+$/.test(NIK)) {
            return res.status(400).json({ success: false, message: "NIK harus berupa angka" });
        }

        // Cek duplikasi NISN
        const existingNISN = await prisma.Siswa.findFirst({ where: { NISN, deleted_at: null } });
        if (existingNISN) {
            return res.status(409).json({ success: false, message: "NISN sudah terdaftar" });
        }

        // Cek duplikasi NIPD
        const existingNIPD = await prisma.Siswa.findFirst({ where: { NIPD, deleted_at: null } });
        if (existingNIPD) {
            return res.status(409).json({ success: false, message: "NIPD sudah terdaftar" });
        }

        // Cek duplikasi NIK
        const existingNIK = await prisma.Siswa.findFirst({ where: { NIK, deleted_at: null } });
        if (existingNIK) {
            return res.status(409).json({ success: false, message: "NIK sudah terdaftar" });
        }

        // Cari kelas berdasarkan nama + jurusan
        const kelasExists = await prisma.Kelas.findFirst({
            where: {
                kelas: nama_kelas,
                jurusan: jurusan,
                deleted_at: null
            }
        });

        if (!kelasExists) {
            return res.status(404).json({
                success: false,
                message: `Kelas ${nama_kelas} jurusan ${jurusan} tidak ditemukan`
            });
        }

        // Validasi format tanggal lahir
        const tanggalLahirDate = new Date(tanggal_lahir);
        if (isNaN(tanggalLahirDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Format tanggal lahir tidak valid (gunakan YYYY-MM-DD)"
            });
        }

        // Handle orang tua
        let orangtuaId = null;
        if (orangtua) {
            const { NIK, nama_orangtua, nomor_telepon: noTelpOrtu, pekerjaan, alamat: alamatOrtu } = orangtua;

            // Validasi field orang tua wajib semua diisi kalau object orangtua dikirim
            if (!NIK || !nama_orangtua || !noTelpOrtu || !pekerjaan || !alamatOrtu) {
                return res.status(400).json({
                    success: false,
                    message: "Data orang tua tidak lengkap (NIK, nama_orangtua, nomor_telepon, pekerjaan, alamat wajib diisi)"
                });
            }

            // Cek apakah orang tua sudah ada berdasarkan NIK
            const existingOrangTua = await prisma.OrangTua.findFirst({
                where: { NIK, deleted_at: null }
            });

            if (existingOrangTua) {
                // Pakai yang sudah ada
                orangtuaId = existingOrangTua.id;
            } else {
                // Buat orang tua baru
                const newOrangTua = await prisma.OrangTua.create({
                    data: {
                        NIK,
                        nama_orangtua,
                        nomor_telepon: noTelpOrtu,
                        pekerjaan,
                        alamat: alamatOrtu
                    }
                });
                orangtuaId = newOrangTua.id;
            }
        }

        // Buat data siswa baru
        const newSiswa = await prisma.siswa.create({
            data: {
                NISN,
                NIPD,
                NIK,
                nama,
                alamat,
                gender,
                tanggal_lahir: tanggalLahirDate,
                nomor_telepon,
                kelas_id: kelasExists.id,
                orangtua_id: orangtuaId
            },
            include: {
                kelas: { select: { kelas: true, jurusan: true } },
                orang_tua: { select: { nama_orangtua: true, nomor_telepon: true } }
            }
        });

        return res.status(201).json({
            success: true,
            message: "Berhasil menambahkan siswa baru",
            data: newSiswa
        });

    } catch (error) {
        console.error("Error creating siswa:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// update data siswa
// update data siswa
const updateSiswa = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            NISN,
            NIPD,
            NIK,
            nama,
            alamat,
            gender,
            tanggal_lahir,
            nomor_telepon,
            kelas_id,
            orangtua_id,
            status_siswa  
        } = req.body;

        // Validasi input wajib
        if (!NISN || !NIPD || !NIK || !nama || !alamat || !gender || !tanggal_lahir || !nomor_telepon || !kelas_id) {
            return res.status(400).json({
                success: false,
                message: "NISN, NIPD, NIK, nama siswa, alamat, gender, tanggal lahir, nomor telepon, dan kelas wajib diisi"
            });
        }

        // Validasi status_siswa jika dikirim
        const VALID_STATUS = ["Active", "Inactive", "Alumni"];
        if (status_siswa && !VALID_STATUS.includes(status_siswa)) {
            return res.status(400).json({
                success: false,
                message: "Status siswa tidak valid. Gunakan: Active, Inactive, atau Alumni"
            });
        }

        // Validasi NISN harus angka
        if (!/^\d+$/.test(NISN)) {
            return res.status(400).json({
                success: false,
                message: "NISN harus berupa angka"
            });
        }

        // Validasi NIPD harus angka
        if (!/^\d+$/.test(NIPD)) {
            return res.status(400).json({
                success: false,
                message: "NIPD harus berupa angka"
            });
        }

        // Validasi NIK harus angka
        if (!/^\d+$/.test(NIK)) {
            return res.status(400).json({
                success: false,
                message: "NIK harus berupa angka"
            });
        }

        // Validasi kelas_id harus angka
        if (isNaN(parseInt(kelas_id))) {
            return res.status(400).json({
                success: false,
                message: "Kelas ID harus berupa angka"
            });
        }

        // Cek siswa apakah ada
        const existingSiswa = await prisma.siswa.findFirst({
            where: { id, deleted_at: null }
        });

        if (!existingSiswa) {
            return res.status(404).json({
                success: false,
                message: "Siswa tidak ditemukan"
            });
        }

        // Validasi kelas exists
        const kelasExists = await prisma.kelas.findFirst({
            where: { id: parseInt(kelas_id), deleted_at: null }
        });

        if (!kelasExists) {
            return res.status(404).json({
                success: false,
                message: "Kelas tidak ditemukan"
            });
        }

        // Validasi orangtua exists (jika diisi)
        if (orangtua_id) {
            const orangTuaExists = await prisma.OrangTua.findFirst({
                where: { id: parseInt(orangtua_id), deleted_at: null }
            });

            if (!orangTuaExists) {
                return res.status(404).json({
                    success: false,
                    message: "Orang tua tidak ditemukan"
                });
            }
        }

        // Cek duplikasi NISN (kecuali data sendiri)
        const duplicateNISN = await prisma.siswa.findFirst({
            where: { NISN, deleted_at: null, NOT: { id } }
        });

        if (duplicateNISN) {
            return res.status(409).json({
                success: false,
                message: "NISN sudah digunakan oleh siswa lain"
            });
        }

        // Cek duplikasi NIPD (kecuali data sendiri)
        const duplicateNIPD = await prisma.siswa.findFirst({
            where: { NIPD, deleted_at: null, NOT: { id } }
        });

        if (duplicateNIPD) {
            return res.status(409).json({
                success: false,
                message: "NIPD sudah digunakan oleh siswa lain"
            });
        }

        // Cek duplikasi NIK (kecuali data sendiri)
        const duplicateNIK = await prisma.siswa.findFirst({
            where: { NIK, deleted_at: null, NOT: { id } }
        });

        if (duplicateNIK) {
            return res.status(409).json({
                success: false,
                message: "NIK sudah digunakan oleh siswa lain"
            });
        }

        // Konversi tanggal lahir
        const tanggalLahirDate = new Date(tanggal_lahir);
        if (isNaN(tanggalLahirDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Format tanggal lahir tidak valid (gunakan YYYY-MM-DD)"
            });
        }

        const updatedSiswa = await prisma.$transaction(async (tx) => {
            // Jika status berubah ke Alumni atau Inactive, nonaktifkan semua RFID
            const statusBerubahKeNonAktif =
                status_siswa &&
                status_siswa !== existingSiswa.status_siswa &&
                (status_siswa === "Alumni" || status_siswa === "Inactive");

            if (statusBerubahKeNonAktif) {
                await tx.rFID.updateMany({
                    where: { siswa_id: id, deleted_at: null },
                    data: { is_active: false }
                });
            }

            return tx.siswa.update({
                where: { id },
                data: {
                    NISN,
                    NIPD,
                    NIK,
                    nama,
                    alamat,
                    gender,
                    tanggal_lahir: tanggalLahirDate,
                    nomor_telepon,
                    kelas_id: parseInt(kelas_id),
                    orangtua_id: orangtua_id ? parseInt(orangtua_id) : null,
                    ...(status_siswa && { status_siswa })
                },
                include: {
                    kelas: { select: { kelas: true, jurusan: true } },
                    orang_tua: { select: { nama_orangtua: true, nomor_telepon: true } }
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mengupdate data siswa",
            data: updatedSiswa
        });

    } catch (error) {
        console.error("Error updating siswa:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


// delete siswa (soft delete)
const deleteSiswa = async (req, res) => {
    try {
        const { id } = req.params;

        // Cek siswa apakah ada
        const existingSiswa = await prisma.siswa.findFirst({
            where: {
                id: id,
                deleted_at: null
            }
        });

        if (!existingSiswa) {
            return res.status(404).json({
                success: false,
                message: "Siswa tidak ditemukan"
            });
        }

        // Cek apakah masih punya RFID aktif
        const hasRFID = await prisma.rFID.count({
            where: {
                siswa_id: id,
                deleted_at: null,
                is_active: true
            }
        });

        if (hasRFID > 0) {
            return res.status(400).json({
                success: false,
                message: "Siswa tidak dapat dihapus karena masih memiliki RFID aktif"
            });
        }

        // Soft delete
        await prisma.siswa.update({
            where: {
                id: id
            },
            data: {
                deleted_at: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil menghapus data siswa"
        });
    } catch (error) {
        console.error("Error deleting siswa:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


const importSiswa = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "File tidak ditemukan. Harap upload file Excel atau CSV"
            });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        if (![".xlsx", ".xls", ".csv"].includes(ext)) {
            return res.status(400).json({
                success: false,
                message: "Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv"
            });
        }

        const workbook = xlsx.read(req.file.buffer, { type: "buffer", cellDates: true });
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "File kosong atau tidak ada data yang dapat dibaca"
            });
        }

        const requiredColumns = [
            "NISN", "NIPD", "NIK", "nama", "alamat", "gender",
            "tanggal_lahir", "nomor_telepon", "nama_kelas", "jurusan"
        ];
        const missingColumns = requiredColumns.filter(col => !Object.keys(rows[0]).includes(col));
        if (missingColumns.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Kolom wajib tidak ditemukan: ${missingColumns.join(", ")}`
            });
        }

        const allNISN = [...new Set(rows.map(r => String(r.NISN).trim()).filter(Boolean))];
        const allNIPD = [...new Set(rows.map(r => String(r.NIPD).trim()).filter(Boolean))];
        const allNIK = [...new Set(rows.map(r => String(r.NIK).trim()).filter(Boolean))];
        const allNIKOrtu = [...new Set(rows.map(r => String(r.NIK_orangtua || "").trim()).filter(Boolean))];

        const [existingSiswaNISN, existingSiswaNIPD, existingSiswaNIK, existingOrtuList, kelasList] = await Promise.all([
            prisma.siswa.findMany({
                where: { NISN: { in: allNISN }, deleted_at: null },
                select: { NISN: true }
            }),
            prisma.siswa.findMany({
                where: { NIPD: { in: allNIPD }, deleted_at: null },
                select: { NIPD: true }
            }),
            prisma.siswa.findMany({
                where: { NIK: { in: allNIK }, deleted_at: null },
                select: { NIK: true }
            }),
            allNIKOrtu.length > 0
                ? prisma.OrangTua.findMany({
                    where: { NIK: { in: allNIKOrtu }, deleted_at: null },
                    select: { id: true, NIK: true }
                })
                : Promise.resolve([]),
            prisma.kelas.findMany({
                where: { deleted_at: null },
                select: { id: true, kelas: true, jurusan: true }
            })
        ]);

        const existingNISNSet = new Set(existingSiswaNISN.map(s => s.NISN));
        const existingNIPDSet = new Set(existingSiswaNIPD.map(s => s.NIPD));
        const existingNIKSet = new Set(existingSiswaNIK.map(s => s.NIK));
        const ortuMap = new Map(existingOrtuList.map(o => [o.NIK, o.id]));
        const kelasMap = new Map(kelasList.map(k => [`${k.kelas}__${k.jurusan}`, k.id]));

        const errors = [];
        const toInsert = [];
        const nisnInFile = new Set();
        const nipdInFile = new Set();
        const nikInFile = new Set();
        const VALID_GENDER = ["L", "P"];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            const rowErrors = [];

            const NISN = String(row.NISN).trim();
            const NIPD = String(row.NIPD).trim();
            const NIK = String(row.NIK).trim();
            const nama = String(row.nama).trim();
            const alamat = String(row.alamat).trim();
            const gender = String(row.gender).trim();
            const tanggal_lahir = row.tanggal_lahir;
            const nomor_telepon = String(row.nomor_telepon).trim();
            const nama_kelas = String(row.nama_kelas).trim();
            const jurusan = String(row.jurusan).trim();

            const NIK_ortu = row.NIK_orangtua ? String(row.NIK_orangtua).trim() : "";
            const nama_ortu = row.nama_orangtua ? String(row.nama_orangtua).trim() : "";
            const telp_ortu = row.nomor_telepon_orangtua ? String(row.nomor_telepon_orangtua).trim() : "";
            const pekerjaan_ortu = row.pekerjaan_orangtua ? String(row.pekerjaan_orangtua).trim() : "";
            const alamat_ortu = row.alamat_orangtua ? String(row.alamat_orangtua).trim() : "";

            if (!NISN) rowErrors.push("NISN kosong");
            if (!NIPD) rowErrors.push("NIPD kosong");
            if (!NIK) rowErrors.push("NIK kosong");
            if (!nama) rowErrors.push("nama kosong");
            if (!alamat) rowErrors.push("alamat kosong");
            if (!gender) rowErrors.push("gender kosong");
            if (!tanggal_lahir) rowErrors.push("tanggal_lahir kosong");
            if (!nomor_telepon) rowErrors.push("nomor_telepon kosong");
            if (!nama_kelas) rowErrors.push("nama_kelas kosong");
            if (!jurusan) rowErrors.push("jurusan kosong");

            if (NISN && !/^\d+$/.test(NISN)) rowErrors.push("NISN harus berupa angka");
            if (NIPD && !/^\d+$/.test(NIPD)) rowErrors.push("NIPD harus berupa angka");
            if (NIK && !/^\d+$/.test(NIK)) rowErrors.push("NIK harus berupa angka");

            if (gender && !VALID_GENDER.includes(gender)) {
                rowErrors.push(`gender tidak valid (harus L atau P, ditemukan: "${gender}")`);
            }

            if (NISN && existingNISNSet.has(NISN)) rowErrors.push(`NISN ${NISN} sudah terdaftar di database`);
            if (NIPD && existingNIPDSet.has(NIPD)) rowErrors.push(`NIPD ${NIPD} sudah terdaftar di database`);
            if (NIK && existingNIKSet.has(NIK)) rowErrors.push(`NIK ${NIK} sudah terdaftar di database`);

            if (NISN) {
                if (nisnInFile.has(NISN)) rowErrors.push(`NISN ${NISN} duplikat dalam file`);
                else nisnInFile.add(NISN);
            }
            if (NIPD) {
                if (nipdInFile.has(NIPD)) rowErrors.push(`NIPD ${NIPD} duplikat dalam file`);
                else nipdInFile.add(NIPD);
            }
            if (NIK) {
                if (nikInFile.has(NIK)) rowErrors.push(`NIK ${NIK} duplikat dalam file`);
                else nikInFile.add(NIK);
            }

            let tanggalLahirDate = null;
            if (tanggal_lahir) {
                tanggalLahirDate = tanggal_lahir instanceof Date ? tanggal_lahir : new Date(tanggal_lahir);
                if (isNaN(tanggalLahirDate.getTime())) {
                    rowErrors.push("Format tanggal_lahir tidak valid (gunakan YYYY-MM-DD)");
                    tanggalLahirDate = null;
                }
            }

            let kelasId = null;
            if (nama_kelas && jurusan) {
                kelasId = kelasMap.get(`${nama_kelas}__${jurusan}`) ?? null;
                if (!kelasId) rowErrors.push(`Kelas ${nama_kelas} jurusan ${jurusan} tidak ditemukan`);
            }

            let orangtuaId = null;
            let orangtuaBaru = null;

            if (NIK_ortu) {
                if (!nama_ortu || !telp_ortu || !pekerjaan_ortu || !alamat_ortu) {
                    rowErrors.push("Data orang tua tidak lengkap (nama, nomor_telepon, pekerjaan, alamat wajib diisi)");
                } else if (ortuMap.has(NIK_ortu)) {
                    orangtuaId = ortuMap.get(NIK_ortu);
                } else {
                    orangtuaBaru = {
                        NIK: NIK_ortu,
                        nama_orangtua: nama_ortu,
                        nomor_telepon: telp_ortu,
                        pekerjaan: pekerjaan_ortu,
                        alamat: alamat_ortu
                    };
                }
            }

            if (rowErrors.length > 0) {
                errors.push({ row: rowNum, errors: rowErrors });
                continue;
            }

            toInsert.push({
                NISN, NIPD, NIK, nama, alamat, gender,
                tanggal_lahir: tanggalLahirDate,
                nomor_telepon,
                kelas_id: kelasId,
                orangtua_id: orangtuaId,
                orangtuaBaru
            });
        }

        if (errors.length > 0) {
            return res.status(422).json({
                success: false,
                message: `Import gagal. Ditemukan ${errors.length} baris dengan error`,
                errors
            });
        }

        // ── Single transaction, no chunking ──
        await prisma.$transaction(async (tx) => {
            const ortuBaruList = toInsert.filter(s => s.orangtuaBaru);
            const nikUnik = new Map(ortuBaruList.map(s => [s.orangtuaBaru.NIK, s.orangtuaBaru]));

            for (const [nik, dataOrtu] of nikUnik) {
                const newOrtu = await tx.OrangTua.create({ data: dataOrtu });
                ortuMap.set(nik, newOrtu.id);
            }

            const siswaNoOrtu = toInsert
                .filter(s => !s.orangtuaBaru)
                .map(s => ({
                    NISN: s.NISN, NIPD: s.NIPD, NIK: s.NIK, nama: s.nama,
                    alamat: s.alamat, gender: s.gender,
                    tanggal_lahir: s.tanggal_lahir,
                    nomor_telepon: s.nomor_telepon,
                    kelas_id: s.kelas_id,
                    orangtua_id: s.orangtua_id
                }));

            if (siswaNoOrtu.length > 0) {
                await tx.siswa.createMany({ data: siswaNoOrtu });
            }

            for (const s of toInsert.filter(s => s.orangtuaBaru)) {
                await tx.siswa.create({
                    data: {
                        NISN: s.NISN, NIPD: s.NIPD, NIK: s.NIK, nama: s.nama,
                        alamat: s.alamat, gender: s.gender,
                        tanggal_lahir: s.tanggal_lahir,
                        nomor_telepon: s.nomor_telepon,
                        kelas_id: s.kelas_id,
                        orangtua_id: ortuMap.get(s.orangtuaBaru.NIK)
                    }
                });
            }
        }, {
            timeout: 30000
        });

        return res.status(201).json({
            success: true,
            message: `Berhasil mengimport ${toInsert.length} data siswa`,
            total_imported: toInsert.length
        });

    } catch (error) {
        console.error("Error importing siswa:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

module.exports = {
    getAllSiswa,
    getSiswaById,
    createSiswa,
    updateSiswa,
    deleteSiswa,
    importSiswa
};