const prisma = require("../config/prisma");
require('dotenv').config();



// get all orang tua
const getAllOrangTua = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const orangTua = await prisma.orangTua.findMany({
            where: {
                deleted_at: null
            },
            orderBy: {
                created_at: "desc"
            },
            skip: skip,
            take: limit,
            include: {
                siswa: {
                    where: {
                        deleted_at: null
                    },
                    select: {
                        id: true,
                        nama: true,
                        kelas: {
                            select: {
                                kelas: true,
                                jurusan: true
                            }
                        }
                    }
                }
            }
        });

        const total = await prisma.orangTua.count({
            where: {
                deleted_at: null
            }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data orang tua",
            data: orangTua,
            pagination: {
                total: total,
                page: page,
                limit: limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// get by id
const getOrangTuaById = async (req, res) => {
    try {
        const { id } = req.params;

        const orangTua = await prisma.orangTua.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            },
            include: {
                siswa: {
                    where: {
                        deleted_at: null
                    },
                    select: {
                        id: true,
                        nama: true,
                        alamat: true,
                        kelas: {
                            select: {
                                kelas: true,
                                jurusan: true,
                                tahun: {
                                    select: {
                                        tahun_ajaran: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!orangTua) {
            return res.status(404).json({
                success: false,
                message: "Data orang tua tidak ditemukan"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data orang tua",
            data: orangTua
        });
    } catch (error) {
        console.error("Error getting orang tua by id:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// menambahkan orang tua
const createOrangTua = async (req, res) => {
    try {
        const { nama_orangtua, nomor_telepon, NIK, pekerjaan, alamat } = req.body;

        if (!nama_orangtua || !nomor_telepon || !NIK || !pekerjaan || !alamat) {
            return res.status(400).json({
                success: false,
                message: "Semua field wajib diisi"
            });
        }

        // validasi format NIK 
        const nikRegex = /^[0-9]{16}$/;
        if (!nikRegex.test(NIK)) {
            return res.status(400).json({
                success: false,
                message: "Format NIK tidak valid (gunakan 16 digit angka)"
            });
        }

        // cek duplikasi NIK
        const existinNIK = await prisma.orangTua.findFirst({
            where: {
                NIK: NIK,
                deleted_at: null
            }
        });

        if (existinNIK) {
            return res.status(409).json({
                success: false,
                message: "NIK sudah terdaftar"
            });
        }

        // validasi format nomor telepon
        const phoneRegex = /^08[0-9]{8,11}$/;
        if (!phoneRegex.test(nomor_telepon)) {
            return res.status(400).json({
                success: false,
                message: "Format nomor telepon tidak valid (gunakan format: 08xx)"
            });
        }

        // Cek duplikasi nomor telepon
        const existingPhone = await prisma.orangTua.findFirst({
            where: {
                nomor_telepon: nomor_telepon,
                deleted_at: null
            }
        });

        if (existingPhone) {
            return res.status(409).json({
                success: false,
                message: "Nomor telepon sudah terdaftar"
            });
        }


        const checkDeletedOrangTua = await prisma.orangTua.findFirst({
            where: {
                nama_orangtua: nama_orangtua,
                nomor_telepon: nomor_telepon,
                NIK: NIK,
                pekerjaan: pekerjaan,
                alamat: alamat,
                deleted_at: {
                    not: null
                }
            }
        });

        if (checkDeletedOrangTua && checkDeletedOrangTua.deleted_at) {

            const restoredOrangTua = await prisma.orangTua.update({
                where: {
                    id: checkDeletedOrangTua.id,
                },
                data: {
                    deleted_at: null,
                    updated_at: new Date()
                }
            });
            // restore orang tua yang sudah di soft delete
            return res.status(200).json({
                success: true,
                message: "Berhasil mengembalikan data orang tua yang sudah dihapus",
                data: restoredOrangTua
            })
        }

        // create orang tua
        const newOrangTua = await prisma.orangTua.create({
            data: {
                nama_orangtua,
                nomor_telepon,
                NIK,
                pekerjaan,
                alamat

            }
        });

        return res.status(201).json({
            success: true,
            message: "Data orang tua berhasil ditambahkan",
            data: newOrangTua
        });
    } catch (error) {
        console.error("Error creating orang tua:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// update data orang tua
const updateOrangTua = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_orangtua, nomor_telepon, NIK, pekerjaan, alamat } = req.body;

        // Validasi input
        if (!nama_orangtua || !nomor_telepon || !NIK || !pekerjaan || !alamat) {
            return res.status(400).json({
                success: false,
                message: "Semua field wajib diisi"
            });
        }


        // validasi format NIK 
        const nikRegex = /^[0-9]{16}$/;
        if (!nikRegex.test(NIK)) {
            return res.status(400).json({
                success: false,
                message: "Format NIK tidak valid (gunakan 16 digit angka)"
            });
        }


        // Cek duplikasi NIK (kecuali data sendiri)
        const duplicateNIK = await prisma.orangTua.findFirst({
            where: {
                NIK: NIK,
                deleted_at: null,
                NOT: {
                    id: parseInt(id)
                }
            }
        });

        if (duplicateNIK) {
            return res.status(409).json({
                success: false,
                message: "NIK sudah digunakan oleh orang tua lain"
            });
        }

        // validasi format nomor telepon
        const phoneRegex = /^08[0-9]{8,11}$/;
        if (!phoneRegex.test(nomor_telepon)) {
            return res.status(400).json({
                success: false,
                message: "Format nomor telepon tidak valid (gunakan format: 08xx)"
            });
        }

        // Cek apakah orang tua ada
        const existingOrangTua = await prisma.orangTua.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            }
        });

        if (!existingOrangTua) {
            return res.status(404).json({
                success: false,
                message: "Data orang tua tidak ditemukan"
            });
        }

        // Cek duplikasi nomor telepon (kecuali data sendiri)
        const duplicatePhone = await prisma.orangTua.findFirst({
            where: {
                nomor_telepon: nomor_telepon,
                deleted_at: null,
                NOT: {
                    id: parseInt(id)
                }
            }
        });

        if (duplicatePhone) {
            return res.status(409).json({
                success: false,
                message: "Nomor telepon sudah digunakan oleh orang tua lain"
            });
        }

        // Update data
        const updatedOrangTua = await prisma.orangTua.update({
            where: {
                id: parseInt(id)
            },
            data: {
                nama_orangtua,
                nomor_telepon,
                NIK,
                pekerjaan,
                alamat,
                updated_at: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: "Data orang tua berhasil diupdate",
            data: updatedOrangTua
        });
    } catch (error) {
        console.error("Error updating orang tua:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

// delete data orang tua (soft delete)
const deleteOrangTua = async (req, res) => {
    try {
        const { id } = req.params;

        // Cek apakah orang tua ada
        const existingOrangTua = await prisma.orangTua.findFirst({
            where: {
                id: parseInt(id),
                deleted_at: null
            }
        });

        if (!existingOrangTua) {
            return res.status(404).json({
                success: false,
                message: "Data orang tua tidak ditemukan"
            });
        }

        // Cek apakah orang tua masih digunakan oleh siswa
        const usedBySiswa = await prisma.siswa.count({
            where: {
                orangtua_id: parseInt(id),
                deleted_at: null
            }
        });

        if (usedBySiswa > 0) {
            return res.status(400).json({
                success: false,
                message: "Data orang tua tidak dapat dihapus karena masih terkait dengan siswa",
                details: `Terdapat ${usedBySiswa} siswa yang terkait dengan orang tua ini`
            });
        }

        // Soft delete
        await prisma.orangTua.update({
            where: {
                id: parseInt(id)
            },
            data: {
                deleted_at: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: "Data orang tua berhasil dihapus"
        });
    } catch (error) {
        console.error("Error deleting orang tua:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error.message
        });
    }
};

module.exports = {
    getAllOrangTua,
    getOrangTuaById,
    createOrangTua,
    updateOrangTua,
    deleteOrangTua,
};