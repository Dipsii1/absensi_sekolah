const prisma = require("../config/prisma");
const path = require("path");
const xlsx = require("xlsx");

// get all siswa 
const getAllSiswa = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
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
            error: error.message
        });
    }
};

// create data siswa 
const createSiswa = async (req, res) => {
    try {
        const {
            nisn,
            nipd,
            nik,
            nama,
            tempat_lahir,
            tgl_lahir,
            jenis_kelamin,
            agama,
            jurusan,
            nama_kelas,
            orangtua
        } = req.body;

        if (!nisn || !nama || !jurusan || !nama_kelas) {
            return res.status(400).json({
                success: false,
                message: "Field wajib: nisn, nama, jurusan, nama_kelas"
            });
        }

        // Normalisasi nipd/nik: string kosong "" → null (hindari bentrok unique constraint pada "")
        const nipdVal = nipd && String(nipd).trim() ? String(nipd).trim() : null;
        const nikVal = nik && String(nik).trim() ? String(nik).trim() : null;

        if (!/^\d+$/.test(nisn)) {
            return res.status(400).json({ success: false, message: "NISN harus berupa angka" });
        }
        if (nipdVal && !/^\d+$/.test(nipdVal)) {
            return res.status(400).json({ success: false, message: "NIPD harus berupa angka" });
        }
        if (nikVal && !/^\d+$/.test(nikVal)) {
            return res.status(400).json({ success: false, message: "NIK harus berupa angka" });
        }
        if (jenis_kelamin && !["L", "P"].includes(jenis_kelamin)) {
            return res.status(400).json({ success: false, message: "jenis_kelamin harus L atau P" });
        }

        // Cek duplikasi nisn
        const existingNisn = await prisma.siswa.findFirst({ where: { nisn, deleted_at: null } });
        if (existingNisn) {
            return res.status(409).json({ success: false, message: "NISN sudah terdaftar" });
        }

        // Cek duplikasi nipd (hanya jika diisi)
        if (nipdVal) {
            const existingNipd = await prisma.siswa.findFirst({ where: { nipd: nipdVal, deleted_at: null } });
            if (existingNipd) {
                return res.status(409).json({ success: false, message: "NIPD sudah terdaftar" });
            }
        }

        // Cek duplikasi nik (hanya jika diisi)
        if (nikVal) {
            const existingNik = await prisma.siswa.findFirst({ where: { nik: nikVal, deleted_at: null } });
            if (existingNik) {
                return res.status(409).json({ success: false, message: "NIK sudah terdaftar" });
            }
        }

        // Cari kelas berdasarkan nama + jurusan
        const kelasExists = await prisma.kelas.findFirst({
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

        let tglLahirDate = null;
        if (tgl_lahir) {
            const match = typeof tgl_lahir === "string" && tgl_lahir.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
            tglLahirDate = match
                ? new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00`)
                : tgl_lahir instanceof Date ? tgl_lahir : new Date(tgl_lahir);
            if (isNaN(tglLahirDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Format tanggal lahir tidak valid (gunakan YYYY-MM-DD)"
                });
            }
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
            const existingOrangTua = await prisma.orangTua.findFirst({
                where: { NIK, deleted_at: null }
            });

            if (existingOrangTua) {
                // Pakai yang sudah ada
                orangtuaId = existingOrangTua.id;
            } else {
                // Buat orang tua baru
                const newOrangTua = await prisma.orangTua.create({
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
                nisn,
                nipd: nipdVal,
                nik: nikVal,
                nama,
                tempat_lahir,
                tgl_lahir: tglLahirDate,
                jenis_kelamin,
                agama,
                jurusan,
                kelas_id: kelasExists.id,
                orangtua_id: orangtuaId
            },
            include: {
                kelas: { select: { kelas: true, jurusan: true } },
                orang_tua: { select: { nama_orangtua: true } }
            }
        });

        // Handle RFID jika ada di payload (rfid atau uid_rfid)
        const inputRfidCreate = req.body.uid_rfid !== undefined ? req.body.uid_rfid : req.body.rfid;
        if (inputRfidCreate && String(inputRfidCreate).trim()) {
            const uidStr = String(inputRfidCreate).trim();
            try {
                const existingRfid = await prisma.rFID.findFirst({
                    where: { uid_rfid: uidStr }
                });
                if (existingRfid) {
                    await prisma.rFID.update({
                        where: { id: existingRfid.id },
                        data: {
                            siswa_id: newSiswa.id,
                            is_active: true,
                            deleted_at: null
                        }
                    });
                } else {
                    await prisma.rFID.create({
                        data: {
                            uid_rfid: uidStr,
                            siswa_id: newSiswa.id,
                            is_active: true
                        }
                    });
                }
            } catch (rfidErr) {
                console.warn("Gagal menyimpan RFID saat createSiswa:", rfidErr.message);
            }
        }

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
const updateSiswa = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nisn,
            nipd,
            nik,
            nama,
            tempat_lahir,
            tgl_lahir,
            jenis_kelamin,
            agama,
            jurusan,
            kelas_id,
            orangtua_id
        } = req.body;

        // Validasi input wajib
        if (!nisn || !nama || !jurusan || !kelas_id) {
            return res.status(400).json({
                success: false,
                message: "Field wajib: nisn, nama, jurusan, kelas_id"
            });
        }

        if (jenis_kelamin && !["L", "P"].includes(jenis_kelamin)) {
            return res.status(400).json({
                success: false,
                message: "jenis_kelamin harus L atau P"
            });
        }

        if (!/^\d+$/.test(nisn)) {
            return res.status(400).json({
                success: false,
                message: "NISN harus berupa angka"
            });
        }

        // Normalisasi nipd/nik: string kosong "" → null
        const nipdVal = nipd && String(nipd).trim() ? String(nipd).trim() : null;
        const nikVal = nik && String(nik).trim() ? String(nik).trim() : null;

        if (nipdVal && !/^\d+$/.test(nipdVal)) {
            return res.status(400).json({
                success: false,
                message: "NIPD harus berupa angka"
            });
        }
        if (nikVal && !/^\d+$/.test(nikVal)) {
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
            const orangTuaExists = await prisma.orangTua.findFirst({
                where: { id: parseInt(orangtua_id), deleted_at: null }
            });

            if (!orangTuaExists) {
                return res.status(404).json({
                    success: false,
                    message: "Orang tua tidak ditemukan"
                });
            }
        }

        // Cek duplikasi nisn (kecuali data sendiri)
        const duplicateNisn = await prisma.siswa.findFirst({
            where: { nisn, deleted_at: null, NOT: { id } }
        });

        if (duplicateNisn) {
            return res.status(409).json({
                success: false,
                message: "NISN sudah digunakan oleh siswa lain"
            });
        }

        // Cek duplikasi nipd (hanya jika diisi, kecuali data sendiri)
        if (nipdVal) {
            const duplicateNipd = await prisma.siswa.findFirst({
                where: { nipd: nipdVal, deleted_at: null, NOT: { id } }
            });

            if (duplicateNipd) {
                return res.status(409).json({
                    success: false,
                    message: "NIPD sudah digunakan oleh siswa lain"
                });
            }
        }

        // Cek duplikasi nik (hanya jika diisi, kecuali data sendiri)
        if (nikVal) {
            const duplicateNik = await prisma.siswa.findFirst({
                where: { nik: nikVal, deleted_at: null, NOT: { id } }
            });

            if (duplicateNik) {
                return res.status(409).json({
                    success: false,
                    message: "NIK sudah digunakan oleh siswa lain"
                });
            }
        }

        // Konversi tanggal lahir (opsional — support YYYY-MM-DD dan DD/MM/YYYY)
        let tglLahirDate = existingSiswa.tgl_lahir;
        if (tgl_lahir !== undefined) {
            if (!tgl_lahir) {
                tglLahirDate = null;
            } else {
                const match = typeof tgl_lahir === "string" && tgl_lahir.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                tglLahirDate = match
                    ? new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00`)
                    : tgl_lahir instanceof Date ? tgl_lahir : new Date(tgl_lahir);
                if (isNaN(tglLahirDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Format tanggal lahir tidak valid (gunakan YYYY-MM-DD)"
                    });
                }
            }
        }

        const updatedSiswa = await prisma.$transaction(async (tx) => {
            return tx.siswa.update({
                where: { id },
                data: {
                    nisn,
                    nipd: nipdVal,
                    nik: nikVal,
                    nama,
                    tempat_lahir,
                    tgl_lahir: tglLahirDate,
                    jenis_kelamin,
                    agama,
                    jurusan,
                    kelas_id: parseInt(kelas_id),
                    orangtua_id: orangtua_id ? parseInt(orangtua_id) : null
                },
                include: {
                    kelas: { select: { kelas: true, jurusan: true } },
                    orang_tua: { select: { nama_orangtua: true } }
                }
            });
        });

        // Handle RFID jika ada di payload (rfid atau uid_rfid)
        const inputRfidUpdate = req.body.uid_rfid !== undefined ? req.body.uid_rfid : req.body.rfid;
        if (inputRfidUpdate !== undefined) {
            const uidStr = String(inputRfidUpdate || "").trim();
            try {
                const activeRfid = await prisma.rFID.findFirst({
                    where: {
                        siswa_id: id,
                        is_active: true,
                        deleted_at: null
                    }
                });

                if (!uidStr) {
                    if (activeRfid) {
                        await prisma.rFID.update({
                            where: { id: activeRfid.id },
                            data: { is_active: false, deleted_at: new Date() }
                        });
                    }
                } else {
                    if (activeRfid) {
                        if (activeRfid.uid_rfid !== uidStr) {
                            await prisma.rFID.update({
                                where: { id: activeRfid.id },
                                data: { uid_rfid: uidStr, is_active: true }
                            });
                        }
                    } else {
                        const existingUid = await prisma.rFID.findFirst({
                            where: { uid_rfid: uidStr }
                        });
                        if (existingUid) {
                            await prisma.rFID.update({
                                where: { id: existingUid.id },
                                data: {
                                    siswa_id: id,
                                    is_active: true,
                                    deleted_at: null
                                }
                            });
                        } else {
                            await prisma.rFID.create({
                                data: {
                                    uid_rfid: uidStr,
                                    siswa_id: id,
                                    is_active: true
                                }
                            });
                        }
                    }
                }
            } catch (rfidErr) {
                console.warn("Gagal meng-update RFID saat updateSiswa:", rfidErr.message);
            }
        }

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
            "NISN", "nama", "nama_kelas", "jurusan"
        ];
        const missingColumns = requiredColumns.filter(col => !Object.keys(rows[0]).includes(col));
        if (missingColumns.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Kolom wajib tidak ditemukan: ${missingColumns.join(", ")}`
            });
        }

        const allNISN = [...new Set(rows.map(r => r.NISN ? String(r.NISN).trim() : "").filter(Boolean))];
        const allNIPD = [...new Set(rows.map(r => r.NIPD ? String(r.NIPD).trim() : "").filter(Boolean))];
        const allNIK = [...new Set(rows.map(r => r.NIK ? String(r.NIK).trim() : "").filter(Boolean))];
        const allNIKOrtu = [...new Set(rows.map(r => r.NIK_orangtua ? String(r.NIK_orangtua).trim() : "").filter(Boolean))];

        const [existingSiswaNISN, existingSiswaNIPD, existingSiswaNIK, existingOrtuList, kelasList] = await Promise.all([
            prisma.siswa.findMany({
                where: { nisn: { in: allNISN }, deleted_at: null },
                select: { nisn: true }
            }),
            allNIPD.length > 0
                ? prisma.siswa.findMany({
                    where: { nipd: { in: allNIPD }, deleted_at: null },
                    select: { nipd: true }
                })
                : Promise.resolve([]),
            allNIK.length > 0
                ? prisma.siswa.findMany({
                    where: { nik: { in: allNIK }, deleted_at: null },
                    select: { nik: true }
                })
                : Promise.resolve([]),
            allNIKOrtu.length > 0
                ? prisma.orangTua.findMany({
                    where: { NIK: { in: allNIKOrtu }, deleted_at: null },
                    select: { id: true, NIK: true }
                })
                : Promise.resolve([]),
            prisma.kelas.findMany({
                where: { deleted_at: null },
                select: { id: true, kelas: true, jurusan: true }
            })
        ]);

        const existingNISNSet = new Set(existingSiswaNISN.map(s => s.nisn));
        const existingNIPDSet = new Set(existingSiswaNIPD.map(s => s.nipd));
        const existingNIKSet = new Set(existingSiswaNIK.map(s => s.nik));
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

            const NISN = row.NISN ? String(row.NISN).trim() : "";
            const NIPD = row.NIPD ? String(row.NIPD).trim() : "";
            const NIK = row.NIK ? String(row.NIK).trim() : "";
            const nama = row.nama ? String(row.nama).trim() : "";
            const tempat_lahir = row.tempat_lahir ? String(row.tempat_lahir).trim() : "";
            const gender = row.gender ? String(row.gender).trim() : "";
            const tanggal_lahir = row.tanggal_lahir || null;
            const agama = row.agama ? String(row.agama).trim() : "";
            const nama_kelas = row.nama_kelas ? String(row.nama_kelas).trim() : "";
            const jurusan = row.jurusan ? String(row.jurusan).trim() : "";

            const NIK_ortu = row.NIK_orangtua ? String(row.NIK_orangtua).trim() : "";
            const nama_ortu = row.nama_orangtua ? String(row.nama_orangtua).trim() : "";
            const telp_ortu = row.nomor_telepon_orangtua ? String(row.nomor_telepon_orangtua).trim() : "";
            const pekerjaan_ortu = row.pekerjaan_orangtua ? String(row.pekerjaan_orangtua).trim() : "";
            const alamat_ortu = row.alamat_orangtua ? String(row.alamat_orangtua).trim() : "";

            if (!NISN) rowErrors.push("NISN kosong");
            if (!nama) rowErrors.push("nama kosong");
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
                const match = typeof tanggal_lahir === "string" && tanggal_lahir.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                tanggalLahirDate = match
                    ? new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00`)
                    : tanggal_lahir instanceof Date ? tanggal_lahir : new Date(tanggal_lahir);
                if (isNaN(tanggalLahirDate.getTime())) {
                    rowErrors.push("Format tanggal_lahir tidak valid (gunakan YYYY-MM-DD atau DD/MM/YYYY)");
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
                NISN, NIPD: NIPD || null, NIK: NIK || null, nama,
                tempat_lahir: tempat_lahir || null, gender: gender || null,
                agama: agama || null,
                tanggal_lahir: tanggalLahirDate,
                kelas_id: kelasId,
                jurusan,
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
                const newOrtu = await tx.orangTua.create({ data: dataOrtu });
                ortuMap.set(nik, newOrtu.id);
            }

            for (const s of toInsert) {
                await tx.siswa.create({
                    data: {
                        nisn: s.NISN, nipd: s.NIPD, nik: s.NIK, nama: s.nama,
                        tempat_lahir: s.tempat_lahir, jenis_kelamin: s.gender,
                        tgl_lahir: s.tanggal_lahir, agama: s.agama,
                        jurusan: s.jurusan,
                        kelas_id: s.kelas_id,
                        orangtua_id: s.orangtua_id || (s.orangtuaBaru ? ortuMap.get(s.orangtuaBaru.NIK) : null)
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