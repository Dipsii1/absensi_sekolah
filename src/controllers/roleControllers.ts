import { Request, Response } from "express";
import prisma from "../config/prisma";

// get all
export const getAllRole = async (req: Request, res: Response) => {
    try {
        const roles = await prisma.role.findMany({
            where: {
                deleted_at: null
            },
            orderBy: {
                created_at: "desc"
            },
            include: {
                _count: {
                    select: { userRole: true }
                }
            }
        });

        // Format response
        const formatedData = roles.map(({ _count, ...role }) => ({
            ...role,
            user_count: _count.userRole
        }));

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data role",
            data: formatedData
        });
    } catch (error) {
        console.error("Error getting role:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// get by id
export const getRoleById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // validasi id
        if (!id || isNaN(parseInt(id as string))) {
            return res.status(400).json({
                success: false,
                message: "ID role tidak valid"
            });
        }

        const role = await prisma.role.findFirst({
            where: {
                id: parseInt(id as string),
                deleted_at: null
            }
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role tidak ditemukan"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data role",
            data: role
        });
    } catch (error) {
        console.error("Error getting by id role:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// create role
export const createRole = async (req: Request, res: Response) => {
    try {
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

        // Validasi input
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Nama role wajib diisi"
            });
        }

        // Cek nama role
        const existingRole = await prisma.role.findFirst({
            where: { name }
        });

        if (existingRole) {
            if (!existingRole.deleted_at) {
                // nama role aktif atau sudah ada yang pakai
                return res.status(409).json({
                    success: false,
                    message: "Nama role sudah ada"
                });
            }

            // role pernah di-soft delete — restore
            const restored = await prisma.role.update({
                where: { id: existingRole.id },
                data: { deleted_at: null }
            });

            return res.status(200).json({
                success: true,
                message: "Berhasil mengembalikan role yang dihapus",
                data: restored
            });
        }

        // Buat role baru
        const newRole = await prisma.role.create({
            data: { name }
        });

        return res.status(201).json({
            success: true,
            message: "Berhasil menambahkan role",
            data: newRole
        });
    } catch (error) {
        console.error("Error creating role:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// update role
export const updateRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

        // validasi id
        if (!id || isNaN(parseInt(id as string))) {
            return res.status(400).json({
                success: false,
                message: "ID role tidak valid"
            });
        }

        // validasi input
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Nama role wajib diisi"
            });
        }

        // cek role
        const existingRole = await prisma.role.findFirst({
            where: {
                id: parseInt(id as string),
                deleted_at: null
            }
        });

        if (!existingRole) {
            return res.status(404).json({
                success: false,
                message: "Role tidak ditemukan"
            });
        }

        // cek duplikasi nama
        const duplicateRole = await prisma.role.findFirst({
            where: {
                name,
                deleted_at: null,
                id: { not: parseInt(id as string) }
            }
        });

        if (duplicateRole) {
            return res.status(409).json({
                success: false,
                message: "Nama role sudah ada"
            });
        }

        const updatedRole = await prisma.role.update({
            where: { id: parseInt(id as string) },
            data: { name }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil memperbarui role",
            data: updatedRole
        });
    } catch (error) {
        console.error("Error updating role:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// delete role
export const deleteRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // validasi id
        if (!id || isNaN(parseInt(id as string))) {
            return res.status(400).json({
                success: false,
                message: "ID role tidak valid"
            });
        }

        // cek apakah role ada
        const existingRole = await prisma.role.findFirst({
            where: {
                id: parseInt(id as string),
                deleted_at: null
            }
        });

        if (!existingRole) {
            return res.status(404).json({
                success: false,
                message: "Role tidak ditemukan"
            });
        }

        // cek role masih dipakai user aktif
        const usedByActiveUser = await prisma.userRole.count({
            where: {
                role_id: parseInt(id as string),
                user: { deleted_at: null }
            }
        });

        if (usedByActiveUser > 0) {
            return res.status(400).json({
                success: false,
                message: "Role masih digunakan oleh user aktif"
            });
        }

        // soft delete role
        await prisma.$transaction([
            prisma.userRole.deleteMany({
                where: { role_id: parseInt(id as string) }
            }),
            prisma.role.update({
                where: { id: parseInt(id as string) },
                data: { deleted_at: new Date() }
            })
        ]);

        return res.status(200).json({
            success: true,
            message: "Berhasil menghapus role"
        });
    } catch (error) {
        console.error("Error deleting role:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};