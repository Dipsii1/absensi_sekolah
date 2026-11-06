import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import XLSX from "xlsx";
import prisma from "../config/prisma";
import { formatDateTime } from "../helper/indexUtils";

// get all
export const getAllRfid = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const whereCondition: Prisma.RFIDWhereInput = {
            deleted_at: null
        };

        const [data, total] = await Promise.all([
            prisma.rFID.findMany({
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
                            nisn: true,
                            jenis_kelamin: true,
                            tempat_lahir: true,
                            tgl_lahir: true,
                            agama: true,
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
            prisma.rFID.count({ where: whereCondition })
        ]);

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
        console.error("Error getting RFID:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        })
    }
}

// laod for client
export const loadAllRfid = async (req: Request, res: Response) => {
    try {
        const data = await prisma.rFID.findMany({
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
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// get by id
export const getRfidById = async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        const rfid = await prisma.rFID.findFirst({
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
        console.error('Error getting by id RFID', error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        })
    }
}

// create RFID
export const createRFID = async (req: Request, res: Response) => {
    try {
        const { uid_rfid, siswa_id, is_active = true } = req.body;

        if (!uid_rfid || !siswa_id) {
            return res.status(400).json({
                success: false,
                message: "uid_rfid dan siswa_id wajib diisi"
            });
        }

        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(String(siswa_id))) {
            return res.status(400).json({
                success: false,
                message: "Format siswa_id tidak valid"
            });
        }

        const siswaExists = await prisma.siswa.findFirst({
            where: {
                id: String(siswa_id),
                deleted_at: null
            }
        });

        if (!siswaExists) {
            return res.status(404).json({
                success: false,
                message: "Siswa tidak ditemukan"
            });
        }

        if (is_active) {
            const siswaActiveRFID = await prisma.rFID.findFirst({
                where: {
                    siswa_id: String(siswa_id),
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

        const existingRFID = await prisma.rFID.findFirst({
            where: { uid_rfid: String(uid_rfid), deleted_at: null }
        });

        if (existingRFID) {
            if (!existingRFID.deleted_at) {
                return res.status(409).json({
                    success: false,
                    message: "UID RFID sudah terdaftar"
                });
            }

            const restored = await prisma.rFID.update({
                where: { id: existingRFID.id },
                data: {
                    siswa_id: String(siswa_id),
                    is_active: Boolean(is_active),
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

        const newRFID = await prisma.rFID.create({
            data: {
                uid_rfid: String(uid_rfid),
                siswa_id: String(siswa_id),
                is_active: Boolean(is_active)
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
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// update RFID
export const updateRFID = async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { uid_rfid, siswa_id, is_active } = req.body;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: "ID tidak valid"
            })
        }

        const existingRFID = await prisma.rFID.findFirst({
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

        const updateData: { uid_rfid?: string; siswa_id?: string; is_active?: boolean } = {};

        if (uid_rfid !== undefined) {
            const duplicateUID = await prisma.rFID.findFirst({
                where: {
                    uid_rfid: String(uid_rfid),
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

            updateData.uid_rfid = String(uid_rfid)
        }

        if (siswa_id !== undefined) {
            const siswaExists = await prisma.siswa.findFirst({
                where: {
                    id: String(siswa_id),
                    deleted_at: null
                }
            });

            if (!siswaExists) {
                return res.status(404).json({
                    success: false,
                    message: "Siswa tidak ditemukan"
                });
            }

            if (is_active !== false) {
                const existingSiswaRFID = await prisma.rFID.findFirst({
                    where: {
                        siswa_id: String(siswa_id),
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

            updateData.siswa_id = String(siswa_id)
        }

        if (is_active !== undefined) {
            if (is_active === true) {
                const existingSiswaRFID = await prisma.rFID.findFirst({
                    where: {
                        siswa_id: String(siswa_id ?? existingRFID.siswa_id),
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

            updateData.is_active = Boolean(is_active)
        }

        const updatedRFID = await prisma.rFID.update({
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
        console.error("Error updating RFID:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        })
    }
}

// delete RFID
export const deleteRFID = async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        const existingRFID = await prisma.rFID.findFirst({
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

        await prisma.rFID.update({
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
        console.error("Error deleting RFID:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        })
    }
}

export const importRFID = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "File xlsx wajib diupload"
            });
        }

        const wb = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

        if (!rows.length) {
            return res.status(400).json({
                success: false,
                message: "File xlsx kosong atau format tidak sesuai"
            });
        }

        const results = {
            inserted: 0,
            skipped: 0,
            errors: [] as { nama: string; nisn: string; uid_rfid: string; reason: string }[]
        };

        for (const row of rows) {
            const nisnRaw = String(row["NISN"] ?? "").trim();
            const nisn = nisnRaw && nisnRaw !== "-"
                ? nisnRaw.padStart(10, "0")
                : "";

            const uid_rfid = String(row["RFID"] ?? "").trim();
            const nama = String(row["Nama"] ?? "").trim();
            const nik = String(row["NIK"] ?? "").trim();

            if (!nisn || !uid_rfid || uid_rfid === "-" || uid_rfid === "undefined") {
                results.errors.push({
                    nama,
                    nisn: nisnRaw,
                    uid_rfid,
                    reason: "NISN atau RFID kosong / tidak valid"
                });
                continue;
            }

            let siswa = await prisma.siswa.findFirst({
                where: { nisn, deleted_at: null }
            });

            if (!siswa) {
                siswa = await prisma.siswa.findFirst({
                    where: { nisn: String(parseInt(nisn, 10)), deleted_at: null }
                });
            }

            if (!siswa && nik && nik !== "-") {
                siswa = await prisma.siswa.findFirst({
                    where: { nik: nik, deleted_at: null }
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

            const existingRFID = await prisma.rFID.findFirst({
                where: { uid_rfid }
            });

            if (existingRFID) {
                if (!existingRFID.deleted_at) {
                    results.skipped++;
                    continue;
                }

                const activeRFID = await prisma.rFID.findFirst({
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

                await prisma.rFID.update({
                    where: { id: existingRFID.id },
                    data: {
                        siswa_id: siswa.id,
                        is_active: true,
                        deleted_at: null
                    }
                });

                results.inserted++;
                continue;
            }

            const activeRFID = await prisma.rFID.findFirst({
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

            await prisma.rFID.create({
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
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
