const prisma = require("../config/prisma");
const { formatDateTime } = require("../helper/indexUtils");
const xlsx = require("xlsx");

// get all
const getAllRfid = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit

        // mencari data yang tidak di hapus
        const whereCondition = {
            deleted_at: null
        }

        const [data, total] = await Promise.all([
            prisma.RFID.findMany({
                where: whereCondition,
                skip,
                take: limit,
                orderBy: {
                    created_at: "desc"
                },
                include: {
                    siswa: {
                        select: {
                            id: true,
                            nama: true,
                            kelas: {
                                select: {
                                    kelas: true,
                                    jurusan: true,
                                    tahun: {
                                        select: {
                                            tahun_ajaran: true,
                                            is_active: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.RFID.count({ where: whereCondition })
        ])

        // Format response
        const formatedData = data.map(rfid => ({
            id: rfid.id,
            uid_rfid: rfid.uid_rfid,
            siswa_id: rfid.siswa_id,
            is_active: rfid.is_active,
            siswa: rfid.siswa,
            created_at: formatDateTime(rfid.created_at),
            updated_at: formatDateTime(rfid.updated_at)
        }));

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil seluruh data RFID siswa",
            data: formatedData,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error("Error getting RFID:", error)
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        })
    }
}

// laod for client
const loadAllRfid = async (req, res) => {
    try {

        const data = await prisma.RFID.findMany({
            where: {
                deleted_at: null,
                is_active: true
            },
            select: {
                uid_rfid: true,
                siswa: {
                    select: {
                        nama: true
                    }
                }
            }
        });

        // format supaya clean
        const formatedData = data.map(item => ({
            uid_rfid: item.uid_rfid,
            nama: item.siswa?.nama || null
        }));

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil data RFID untuk cache",
            data: formatedData
        });

    } catch (error) {
        console.error("Error getting RFID:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};
// get by id 
const getRfidById = async (req, res) => {
    try {
        const { id } = req.params

        const rfid = await prisma.RFID.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            },
            include: {
                siswa: {
                    select: {
                        id: true,
                        nama: true,
                        kelas: {
                            select: {
                                kelas: true,
                                jurusan: true,
                                tahun: {
                                    select: {
                                        tahun_ajaran: true,
                                        is_active: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!rfid) {
            return res.status(404).json({
                success: false,
                message: "RFID tidak ditemukan"
            });
        }

        // Format response
        const formatedRfid = {
            id: rfid.id,
            uid_rfid: rfid.uid_rfid,
            siswa_id: rfid.siswa_id,
            is_active: rfid.is_active,
            siswa: rfid.siswa,
            created_at: formatDateTime(rfid.created_at),
            updated_at: formatDateTime(rfid.updated_at)
        };

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data RFID",
            data: formatedRfid
        })
    } catch (error) {
        console.error('Error getting by id RFID', error)
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        })
    }
}

// create RFID 
const createRFID = async (req, res) => {
    try {
        const { uid_rfid, siswa_id, is_active = true } = req.body;

        // Validasi input
        if (!uid_rfid || !siswa_id) {
            return res.status(400).json({
                success: false,
                message: "uid_rfid dan siswa_id wajib diisi"
            });
        }

        // Validasi format UUID untuk siswa_id
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(siswa_id)) {
            return res.status(400).json({
                success: false,
                message: "Format siswa_id tidak valid"
            });
        }

        // Cek siswa exist
        const siswaExists = await prisma.siswa.findFirst({
            where: {
                id: siswa_id,
                deleted_at: null
            }
        });

        if (!siswaExists) {
            return res.status(404).json({
                success: false,
                message: "Siswa tidak ditemukan"
            });
        }

        // Cek siswa sudah punya RFID aktif 
        if (is_active) {
            const siswaActiveRFID = await prisma.RFID.findFirst({
                where: {
                    siswa_id,
                    is_active: true,
                    deleted_at: null
                }
            });

            if (siswaActiveRFID) {
                return res.status(409).json({
                    success: false,
                    message: "Siswa sudah mempunyai RFID yang aktif"
                });
            }
        }

        // Cek uid_rfid 
        const existingRFID = await prisma.RFID.findFirst({
            where: { uid_rfid, deleted_at: null }
        });

        if (existingRFID) {
            if (!existingRFID.deleted_at) {
                // uid_rfid aktif atau sudah ada yang pakai
                return res.status(409).json({
                    success: false,
                    message: "UID RFID sudah terdaftar"
                });
            }

            // uid_rfid pernah di-soft delete — restore
            const restored = await prisma.RFID.update({
                where: { id: existingRFID.id },
                data: {
                    siswa_id,
                    is_active,
                    deleted_at: null
                },
                include: {
                    siswa: {
                        select: {
                            id: true,
                            nama: true,
                            kelas: {
                                select: {
                                    kelas: true,
                                    jurusan: true,
                                    tahun: {
                                        select: {
                                            tahun_ajaran: true,
                                            is_active: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            return res.status(200).json({
                success: true,
                message: "Berhasil mengembalikan data RFID yang pernah dihapus",
                data: {
                    id: restored.id,
                    uid_rfid: restored.uid_rfid,
                    siswa_id: restored.siswa_id,
                    is_active: restored.is_active,
                    siswa: restored.siswa,
                    created_at: formatDateTime(restored.created_at),
                    updated_at: formatDateTime(restored.updated_at)
                }
            });
        }

        //  Buat RFID baru
        const newRFID = await prisma.RFID.create({
            data: {
                uid_rfid,
                siswa_id,
                is_active
            },
            include: {
                siswa: {
                    select: {
                        id: true,
                        nama: true,
                        kelas: {
                            select: {
                                kelas: true,
                                jurusan: true,
                                tahun: {
                                    select: {
                                        tahun_ajaran: true,
                                        is_active: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        return res.status(201).json({
            success: true,
            message: "Berhasil membuat data RFID baru",
            data: {
                id: newRFID.id,
                uid_rfid: newRFID.uid_rfid,
                siswa_id: newRFID.siswa_id,
                is_active: newRFID.is_active,
                siswa: newRFID.siswa,
                created_at: formatDateTime(newRFID.created_at),
                updated_at: formatDateTime(newRFID.updated_at)
            }
        });

    } catch (error) {
        console.error("Error creating RFID:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};


// update RFID
const updateRFID = async (req, res) => {
    try {
        const { id } = req.params;
        const { uid_rfid, siswa_id, is_active } = req.body

        // validasi id 
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: "ID tidak valid"
            })
        }

        // cek RFID
        const existingRFID = await prisma.RFID.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            }
        })

        if (!existingRFID) {
            return res.status(404).json({
                success: false,
                message: "RFID tidak ditemukan"
            })
        }

        // build updateData
        const updateData = {}

        if (uid_rfid !== undefined) {
            // cek duplikasi uid_rfid
            const duplicateUID = await prisma.RFID.findFirst({
                where: {
                    uid_rfid,
                    id: { not: parseInt(id) },
                    deleted_at: null
                }
            })

            if (duplicateUID) {
                return res.status(409).json({
                    success: false,
                    message: "UID RFID sudah digunakan"
                })
            }

            updateData.uid_rfid = uid_rfid
        }

        if (siswa_id !== undefined) {
            // Validasi siswa exists jika siswa_id diubah
            const siswaExists = await prisma.siswa.findFirst({
                where: {
                    id: siswa_id,
                    deleted_at: null
                }
            });

            if (!siswaExists) {
                return res.status(404).json({
                    success: false,
                    message: "Siswa tidak ditemukan"
                });
            }

            // Cek apakah siswa sudah punya RFID aktif lain
            if (is_active !== false) {
                const existingSiswaRFID = await prisma.RFID.findFirst({
                    where: {
                        siswa_id,
                        is_active: true,
                        id: { not: parseInt(id) },
                        deleted_at: null
                    }
                });

                if (existingSiswaRFID) {
                    return res.status(409).json({
                        success: false,
                        message: "Siswa sudah mempunyai RFID yang aktif"
                    });
                }
            }

            updateData.siswa_id = siswa_id
        }

        if (is_active !== undefined) {
            // Jika akan mengaktifkan RFID, cek apakah siswa sudah punya RFID aktif lain
            if (is_active === true) {
                const existingSiswaRFID = await prisma.RFID.findFirst({
                    where: {
                        siswa_id: siswa_id || existingRFID.siswa_id,
                        is_active: true,
                        id: { not: parseInt(id) },
                        deleted_at: null
                    }
                });

                if (existingSiswaRFID) {
                    return res.status(409).json({
                        success: false,
                        message: "Siswa sudah mempunyai RFID yang aktif"
                    });
                }
            }

            updateData.is_active = is_active
        }

        const updatedRFID = await prisma.RFID.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                siswa: {
                    select: {
                        id: true,
                        nama: true,
                        kelas: {
                            select: {
                                kelas: true,
                                jurusan: true,
                                tahun: {
                                    select: {
                                        tahun_ajaran: true,
                                        is_active: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Format response
        const formatedRFID = {
            id: updatedRFID.id,
            uid_rfid: updatedRFID.uid_rfid,
            siswa_id: updatedRFID.siswa_id,
            is_active: updatedRFID.is_active,
            siswa: updatedRFID.siswa,
            created_at: formatDateTime(updatedRFID.created_at),
            updated_at: formatDateTime(updatedRFID.updated_at)
        };

        return res.status(200).json({
            success: true,
            message: "Berhasil mengupdate data RFID",
            data: formatedRFID
        })
    } catch (error) {
        console.error("Error updating RFID:", error)
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        })
    }
}


// delete RFID 

const deleteRFID = async (req, res) => {
    try {
        const { id } = req.params;

        //  cek apakah RFID ada
        const existingRFID = await prisma.RFID.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            }
        });

        if (!existingRFID) {
            return res.status(404).json({
                success: false,
                message: "RFID tidak ditemukan"
            });
        }

        // soft delete RFID
        await prisma.RFID.update({
            where: { id: parseInt(id) },
            data: {
                deleted_at: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil menghapus data RFID"
        })
    } catch (error) {
        console.error("Error deleting RFID:", error)
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        })
    }
}

const importRFID = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "File xlsx wajib diupload"
            });
        }

        const wb = xlsx.read(req.file.buffer, { type: "buffer" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(ws);

        if (!rows.length) {
            return res.status(400).json({
                success: false,
                message: "File xlsx kosong atau format tidak sesuai"
            });
        }

        const results = {
            inserted: 0,
            skipped: 0,
            errors: []
        };

        for (const row of rows) {
            // Normalize NISN: bisa berupa angka (Excel auto-convert), pad ke 10 digit
            const nisnRaw = String(row["NISN"] ?? "").trim();
            const nisn = nisnRaw && nisnRaw !== "-"
                ? nisnRaw.padStart(10, "0")
                : "";

            const uid_rfid = String(row["RFID"] ?? "").trim();
            const nama = String(row["Nama"] ?? "").trim();
            const nik = String(row["NIK"] ?? "").trim();

            // Validasi: NISN kosong/dash, RFID kosong/dash/"undefined"
            if (!nisn || !uid_rfid || uid_rfid === "-" || uid_rfid === "undefined") {
                results.errors.push({
                    nama,
                    nisn: nisnRaw,
                    uid_rfid,
                    reason: "NISN atau RFID kosong / tidak valid"
                });
                continue;
            }

            // Cari siswa: coba NISN dulu, fallback ke NIK jika ada
            let siswa = await prisma.siswa.findFirst({
                where: { NISN: nisn, deleted_at: null }
            });

            // Fallback: coba NISN tanpa leading zero (jika database simpan tanpa padding)
            if (!siswa) {
                siswa = await prisma.siswa.findFirst({
                    where: { NISN: String(parseInt(nisn, 10)), deleted_at: null }
                });
            }

            // Fallback: coba NIK jika ada di model siswa
            if (!siswa && nik && nik !== "-") {
                siswa = await prisma.siswa.findFirst({
                    where: { NIK: nik, deleted_at: null }
                });
            }

            if (!siswa) {
                results.errors.push({
                    nama,
                    nisn: nisnRaw,
                    uid_rfid,
                    reason: "Siswa tidak ditemukan di database"
                });
                continue;
            }

            // Cek uid_rfid sudah terdaftar (skip duplikat RFID)
            const existingRFID = await prisma.RFID.findFirst({
                where: { uid_rfid, deleted_at: null }
            });

            if (existingRFID) {
                results.skipped++;
                continue;
            }

            // Cek siswa sudah punya RFID aktif
            const activeRFID = await prisma.RFID.findFirst({
                where: { siswa_id: siswa.id, is_active: true, deleted_at: null }
            });

            if (activeRFID) {
                results.errors.push({
                    nama,
                    nisn: nisnRaw,
                    uid_rfid,
                    reason: "Siswa sudah memiliki RFID aktif"
                });
                continue;
            }

            await prisma.RFID.create({
                data: {
                    uid_rfid,
                    siswa_id: siswa.id,
                    is_active: true
                }
            });

            results.inserted++;
        }

        return res.status(200).json({
            success: true,
            message: `Import selesai: ${results.inserted} berhasil, ${results.skipped} dilewati, ${results.errors.length} error`,
            data: results
        });

    } catch (error) {
        console.error("Error importing RFID:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

module.exports = {
    getAllRfid,
    loadAllRfid,
    getRfidById,
    createRFID,
    updateRFID,
    deleteRFID,
    importRFID
}