const prisma = require("../config/prisma");

// get all
const getAllGuru = async (req, res) => {
    try {
        const guru = await prisma.guru.findMany({
            where: {
                deleted_at: null,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data guru",
            data: guru,
        });
    } catch (error) {
        console.error("Error getting guru:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message,
        });
    }
};

// get by id
const getGuruById = async (req, res) => {
    try {
        const { id } = req.params;

        if (isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: "ID guru tidak valid",
            });
        }

         
        const guru = await prisma.guru.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null,
            },
            include: {
                jadwal: {
                    where: {
                        deleted_at: null,
                    },
                     
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
            error: error.message,
        });
    }
};


const getGuruWalas = async (req, res) => {
    try {
        const guru = await prisma.guru.findMany({
            where: {
                deleted_at: null,

                user: {
                    userRole: {
                        some: {
                            role: {
                                name: "WALAS",
                                deleted_at: null
                            }
                        }
                    }
                },

                kelas_walas: {
                    none: {}
                }
            },

            orderBy: {
                nama: "asc"
            },

            select: {
                id: true,
                NIP: true,
                nama: true,
            }
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
            error: error.message,
        });
    }
};

// Create guru
const createGuru = async (req, res) => {
    try {
        const { NIP, nama, nomor_telepon, alamat, tanggal_lahir } = req.body;

        if (!NIP || !nama || !nomor_telepon || !alamat || !tanggal_lahir) {
            return res.status(400).json({
                success: false,
                message: "Semua field harus diisi",
            });
        }

        // Konversi tanggal terlebih dahulu sebelum query apapun
        const tanggalLahirDate = new Date(tanggal_lahir.replace(" ", "T"));

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
                // Restore data yang pernah dihapus
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
            error: error.message,
        });
    }
};

// update guru
const updateGuru = async (req, res) => {
    try {
        const { id } = req.params;
        const { NIP, nama, nomor_telepon, alamat, tanggal_lahir } = req.body;

        if (!NIP || !nama || !nomor_telepon || !alamat || !tanggal_lahir) {
            return res.status(400).json({
                success: false,
                message: "Semua field harus diisi",
            });
        }

        
        const tanggalLahirDate = new Date(tanggal_lahir.replace(" ", "T"));

        if (isNaN(tanggalLahirDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Format tanggal lahir tidak valid",
            });
        }

         
        const existingGuru = await prisma.guru.findFirst({
            where: {
                id: parseInt(id),
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
                NOT: { id: parseInt(id) },
            },
        });

        if (duplicateGuru) {
            return res.status(409).json({
                success: false,
                message: "Guru dengan NIP tersebut sudah ada",
            });
        }

        const updatedGuru = await prisma.guru.update({
            where: { id: parseInt(id) },
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
            error: error.message,
        });
    }
};

// delete guru (soft delete)
const deleteGuru = async (req, res) => {
    try {
        const { id } = req.params;

         
        const existingGuru = await prisma.guru.findFirst({
            where: {
                id: parseInt(id),
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
                guru_id: parseInt(id),
                deleted_at: null,
            },
        });

        if (relatedJadwal) {
            return res.status(400).json({
                success: false,
                message: "Guru tidak dapat dihapus karena terkait dengan data jadwal mengajar",
            });
        }

        const deletedGuru = await prisma.guru.update({
            where: { id: parseInt(id) },
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
            error: error.message,
        });
    }
};

module.exports = {
    getAllGuru,
    getGuruById,
    createGuru,
    updateGuru,
    deleteGuru,
    getGuruWalas
};