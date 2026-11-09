import { Request, Response } from "express";
import axios from "axios";
import prisma from "../config/prisma";

interface YsboStaff {
  id: string | number;
  text: string;
  id_school: string;
}

interface YsboResponse {
  status_code: number;
  data: YsboStaff[];
}

// generate x api key for ysbo
const getApiKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `SARPRAS-STARBHAK${year}${month}`;
};

export const getAllGuru = async (req: Request, res: Response) => {
    try {
        const ysboToken = req.headers["x-ysbo-token"];

        if (ysboToken) {
            try {
                const client = axios.create({
                    baseURL: process.env.YSBO_API_BASE_URL,
                    headers: {
                        "Authorization": `Bearer ${ysboToken}`,
                        "x-api-key": getApiKey(),
                    },
                });

                const response = await client.get<YsboResponse>("/masterdata/list-staff");
                const ysboData = response.data;

                if (ysboData.status_code === 200 && Array.isArray(ysboData.data)) {
                    const filteredGuru = ysboData.data.filter((g) => g.id_school === "TB002");

                    const roleCache = await prisma.role.findFirst({
                        where: { name: "GURU" },
                    });

                    if (!roleCache) {
                        console.warn("Sync YSBO gagal: Role GURU tidak ditemukan di database lokal");
                    } else {
                        await Promise.allSettled(
                            filteredGuru.map(async (guru) => {
                                try {
                                    const upsertedGuru = await prisma.guru.upsert({
                                        where: { NIP: String(guru.id) },
                                        update: { nama: guru.text.trim(), deleted_at: null },
                                        create: {
                                            NIP: String(guru.id),
                                            nama: guru.text.trim(),
                                            nomor_telepon: "-",
                                            alamat: "-",
                                            tanggal_lahir: new Date("2000-01-01"),
                                        },
                                    });

                                    const existingUser = await prisma.user.findFirst({
                                        where: { guru_id: upsertedGuru.id, deleted_at: null },
                                    });

                                    if (!existingUser) {
                                        await prisma.user.create({
                                            data: {
                                                username: String(guru.id),
                                                password: "-",
                                                guru_id: upsertedGuru.id,
                                                userRole: {
                                                    create: [{ role_id: roleCache.id }],
                                                },
                                            },
                                        });
                                    }
                                } catch (err) {
                                    console.error("Error upserting guru", guru.id, ":", err instanceof Error ? err.message : String(err));
                                }
                            })
                        );
                    }
                }
            } catch (ysboError) {
                console.error("Sync YSBO gagal:", ysboError instanceof Error ? ysboError.message : String(ysboError));
                if ((ysboError as { response?: { status?: number; data?: unknown } }).response) {
                    const resp = (ysboError as { response: { status: number; data: unknown } }).response;
                    console.error("YSBO Error Response:", resp.status, resp.data);
                }
            }
        }

        const guru = await prisma.guru.findMany({
            where: { deleted_at: null },
            orderBy: { nama: "asc" },
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data guru",
            data: guru,
        });

    } catch (error) {
        console.error("Error getting all guru:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil data guru",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// get by id
export const getGuruById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (isNaN(parseInt(id as string))) {
            return res.status(400).json({
                success: false,
                message: "ID guru tidak valid",
            });
        }

        const guru = await prisma.guru.findFirst({
            where: {
                id: parseInt(id as string),
                deleted_at: null,
            },
            include: {
                jadwal: {
                    orderBy: {
                        jam_mulai: "asc",
                    },
                    select: {
                        hari: true,
                        jam_mulai: true,
                        jam_selesai: true,
                        kelas: {
                            select: {
                                kelas: true,
                                jurusan: true,
                            },
                        },
                        mata_pelajaran: {
                            select: {
                                nama_mapel: true,
                            },
                        },
                    },
                },
            },
        });

        if (!guru) {
            return res.status(404).json({
                success: false,
                message: "Guru tidak ditemukan",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data guru beserta jadwal",
            data: guru,
        });
    } catch (error) {
        console.error("Error getting guru:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

export const getGuruWalas = async (req: Request, res: Response) => {
    try {
        const guru = await prisma.guru.findMany({
            where: {
                deleted_at: null,
                user: {
                    userRole: {
                        some: {
                            role: {
                                name: "WALAS",
                                deleted_at: null,
                            },
                        },
                    },
                },
                kelas_walas: {
                    none: {},
                },
            },
            orderBy: {
                nama: "asc",
            },
            select: {
                id: true,
                NIP: true,
                nama: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data guru walas yang belum mempunyai kelas",
            data: guru,
        });
    } catch (error) {
        console.error("Error getting guru walas:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Create guru
export const createGuru = async (req: Request, res: Response) => {
    try {
        const { NIP, nama, nomor_telepon, alamat, tanggal_lahir } = req.body;

        if (!NIP || !nama || !nomor_telepon || !alamat || !tanggal_lahir) {
            return res.status(400).json({
                success: false,
                message: "Semua field harus diisi",
            });
        }

        const tanggalLahirDate = new Date(String(tanggal_lahir).replace(" ", "T"));

        if (isNaN(tanggalLahirDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Format tanggal lahir tidak valid",
            });
        }

        const existingGuru = await prisma.guru.findFirst({
            where: { NIP },
        });

        if (existingGuru) {
            if (existingGuru.deleted_at) {
                const restoredGuru = await prisma.guru.update({
                    where: { id: existingGuru.id },
                    data: {
                        deleted_at: null,
                        nama,
                        nomor_telepon,
                        alamat,
                        tanggal_lahir: tanggalLahirDate,
                    },
                });

                return res.status(200).json({
                    success: true,
                    message: "Berhasil mengembalikan data guru yang dihapus",
                    data: restoredGuru,
                });
            }

            return res.status(409).json({
                success: false,
                message: "Guru dengan NIP tersebut sudah ada",
            });
        }

        const newGuru = await prisma.guru.create({
            data: {
                NIP,
                nama,
                nomor_telepon,
                alamat,
                tanggal_lahir: tanggalLahirDate,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Berhasil menambahkan guru baru",
            data: newGuru,
        });
    } catch (error) {
        console.error("Error creating guru:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// update guru
export const updateGuru = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { NIP, nama, nomor_telepon, alamat, tanggal_lahir } = req.body;

        if (!NIP || !nama || !nomor_telepon || !alamat || !tanggal_lahir) {
            return res.status(400).json({
                success: false,
                message: "Semua field harus diisi",
            });
        }

        const tanggalLahirDate = new Date(String(tanggal_lahir).replace(" ", "T"));

        if (isNaN(tanggalLahirDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Format tanggal lahir tidak valid",
            });
        }

        const existingGuru = await prisma.guru.findFirst({
            where: {
                id: parseInt(id as string),
                deleted_at: null,
            },
        });

        if (!existingGuru) {
            return res.status(404).json({
                success: false,
                message: "Guru tidak ditemukan",
            });
        }

        const duplicateGuru = await prisma.guru.findFirst({
            where: {
                NIP,
                deleted_at: null,
                NOT: { id: parseInt(id as string) },
            },
        });

        if (duplicateGuru) {
            return res.status(409).json({
                success: false,
                message: "Guru dengan NIP tersebut sudah ada",
            });
        }

        const updatedGuru = await prisma.guru.update({
            where: { id: parseInt(id as string) },
            data: {
                NIP,
                nama,
                nomor_telepon,
                alamat,
                tanggal_lahir: tanggalLahirDate,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mengupdate data guru",
            data: updatedGuru,
        });
    } catch (error) {
        console.error("Error updating guru:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// delete guru (soft delete)
export const deleteGuru = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const existingGuru = await prisma.guru.findFirst({
            where: {
                id: parseInt(id as string),
                deleted_at: null,
            },
        });

        if (!existingGuru) {
            return res.status(404).json({
                success: false,
                message: "Guru tidak ditemukan",
            });
        }

        const relatedJadwal = await prisma.jadwal.findFirst({
            where: {
                guru_id: parseInt(id as string),
            },
        });

        if (relatedJadwal) {
            return res.status(400).json({
                success: false,
                message: "Guru tidak dapat dihapus karena terkait dengan data jadwal mengajar",
            });
        }

        const deletedGuru = await prisma.guru.update({
            where: { id: parseInt(id as string) },
            data: { deleted_at: new Date() },
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil menghapus guru",
            data: deletedGuru,
        });
    } catch (error) {
        console.error("Error deleting guru:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
