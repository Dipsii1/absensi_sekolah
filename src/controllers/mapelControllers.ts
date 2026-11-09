import { Request, Response } from "express";
import prisma from "../config/prisma";

const parseId = (value: string | string[] | undefined) => {
    const raw = Array.isArray(value) ? value[0] : value;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const cleanStr = (value: unknown) => {
    if (value === undefined || value === null) return undefined;
    return String(value).trim();
};

// Cari bentrok nama/kode (termasuk yang soft delete, karena unique di level DB)
const findConflict = async ({ nama_mapel, kode_mapel, excludeId }: { nama_mapel: string; kode_mapel: string | undefined; excludeId: number }) => {
    const or: { nama_mapel?: string; kode_mapel?: string }[] = [];
    if (nama_mapel) or.push({ nama_mapel });
    if (kode_mapel) or.push({ kode_mapel });
    if (or.length === 0) return null;

    return prisma.mataPelajaran.findFirst({
        where: {
            OR: or,
            ...(excludeId && { NOT: { id: excludeId } })
        }
    });
};

const conflictMessage = (conflict: { nama_mapel: string; deleted_at: Date | null }, { nama_mapel, kode_mapel }: { nama_mapel: string; kode_mapel: string | null }) => {
    const field = conflict.nama_mapel === nama_mapel ? "Nama" : "Kode";
    return conflict.deleted_at
        ? `${field} mata pelajaran sudah dipakai oleh mata pelajaran yang telah dihapus`
        : `${field} mata pelajaran sudah ada`;
};

// GET ALL mapel
export const getAllMapel = async (req: Request, res: Response) => {
    try {
        const mapel = await prisma.mataPelajaran.findMany({
            where: { deleted_at: null },
            orderBy: { created_at: "desc" }
        });
        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data mata pelajaran",
            data: mapel
        });
    } catch (error) {
        console.log("Error getting mapel:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// GET BY ID mapel
export const getMapelById = async (req: Request, res: Response) => {
    try {
        const id = parseId(req.params.id);
        if (id === null) {
            return res.status(400).json({ success: false, message: "ID tidak valid" });
        }

        const mapel = await prisma.mataPelajaran.findFirst({
            where: { id, deleted_at: null }
        });

        if (!mapel) {
            return res.status(404).json({
                success: false,
                message: "Mata pelajaran tidak ditemukan"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Berhasil mendapatkan data mata pelajaran",
            data: mapel
        });
    } catch (error) {
        console.log("Error getting mapel:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// CREATE mapel
export const createMapel = async (req: Request, res: Response) => {
    try {
        const nama_mapel = cleanStr(req.body.nama_mapel);
        const kode_mapel = cleanStr(req.body.kode_mapel) || null;

        if (!nama_mapel) {
            return res.status(400).json({
                success: false,
                message: "Nama mata pelajaran wajib diisi"
            });
        }

        const conflicts = await prisma.mataPelajaran.findMany({
            where: {
                OR: [
                    { nama_mapel },
                    ...(kode_mapel ? [{ kode_mapel }] : [])
                ]
            }
        });

        const active = conflicts.find(c => !c.deleted_at);
        if (active) {
            return res.status(409).json({
                success: false,
                message: conflictMessage(active, { nama_mapel, kode_mapel })
            });
        }

        // Nama dan kode masing-masing cocok dengan mapel terhapus yang berbeda
        if (conflicts.length > 1) {
            return res.status(409).json({
                success: false,
                message: "Nama dan kode cocok dengan dua mata pelajaran terhapus yang berbeda. Gunakan salah satunya saja"
            });
        }

        // Cocok dengan satu mapel terhapus (lewat nama atau kode): restore dan perbarui
        if (conflicts.length === 1) {
            const restoredMapel = await prisma.mataPelajaran.update({
                where: { id: conflicts[0].id },
                data: {
                    deleted_at: null,
                    nama_mapel,
                    ...(kode_mapel && { kode_mapel })
                }
            });

            return res.status(200).json({
                success: true,
                message: "Berhasil mengembalikan mata pelajaran yang dihapus",
                data: restoredMapel
            });
        }

        const newMapel = await prisma.mataPelajaran.create({
            data: { nama_mapel, kode_mapel }
        });

        return res.status(201).json({
            success: true,
            message: "Berhasil menambahkan mata pelajaran",
            data: newMapel
        });
    } catch (error) {
        if ((error as { code?: string }).code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "Nama atau kode mata pelajaran sudah ada"
            });
        }
        console.log("Error creating mapel:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// UPDATE mapel
export const updateMapel = async (req: Request, res: Response) => {
    try {
        const id = parseId(req.params.id);
        if (id === null) {
            return res.status(400).json({ success: false, message: "ID tidak valid" });
        }

        const nama_mapel = cleanStr(req.body.nama_mapel);
        // undefined = tidak diubah, "" = dikosongkan (null)
        const kodeInput = cleanStr(req.body.kode_mapel);
        const kode_mapel = kodeInput === undefined ? undefined : kodeInput || null;

        if (!nama_mapel) {
            return res.status(400).json({
                success: false,
                message: "Nama mata pelajaran wajib diisi"
            });
        }

        const existingMapel = await prisma.mataPelajaran.findFirst({
            where: { id, deleted_at: null }
        });

        if (!existingMapel) {
            return res.status(404).json({
                success: false,
                message: "Mata pelajaran tidak ditemukan"
            });
        }

        const conflict = await findConflict({
            nama_mapel,
            kode_mapel: kode_mapel || undefined,
            excludeId: id
        });

        if (conflict) {
            return res.status(409).json({
                success: false,
                message: conflictMessage(conflict, { nama_mapel, kode_mapel })
            });
        }

        const updatedMapel = await prisma.mataPelajaran.update({
            where: { id },
            data: {
                nama_mapel,
                ...(kode_mapel !== undefined && { kode_mapel })
            }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil memperbarui mata pelajaran",
            data: updatedMapel
        });
    } catch (error) {
        if ((error as { code?: string }).code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "Nama atau kode mata pelajaran sudah ada"
            });
        }
        console.log("Error updating mapel:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// DELETE mapel (soft delete)
export const deleteMapel = async (req: Request, res: Response) => {
    try {
        const id = parseId(req.params.id);
        if (id === null) {
            return res.status(400).json({ success: false, message: "ID tidak valid" });
        }

        const existingMapel = await prisma.mataPelajaran.findFirst({
            where: { id, deleted_at: null }
        });

        if (!existingMapel) {
            return res.status(404).json({
                success: false,
                message: "Mata pelajaran tidak ditemukan"
            });
        }

        const usedInJadwal = await prisma.jadwal.count({
            where: { mapel_id: id }
        });

        if (usedInJadwal > 0) {
            return res.status(400).json({
                success: false,
                message: "Mata pelajaran masih digunakan di jadwal"
            });
        }

        await prisma.mataPelajaran.update({
            where: { id },
            data: { deleted_at: new Date() }
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil menghapus mata pelajaran"
        });
    } catch (error) {
        console.log("Error deleting mapel:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
