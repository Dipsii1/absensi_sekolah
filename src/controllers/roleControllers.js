const prisma = require("../config/prisma");

// GET ALL Role
const getAllRole = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan data role",
      data: roles,
    });
  } catch (error) {
    console.log("Error getting roles:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

// GET BY ID Role
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findFirst({
      where: {
        id: parseInt(id),
        deleted_at: null,
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan data role",
      data: role,
    });
  } catch (error) {
    console.log("Error getting role:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

// CREATE Role
const createRole = async (req, res) => {
  try {
    const { name } = req.body;

    // Validasi input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Nama role wajib diisi",
      });
    }

    // Cek duplikasi nama role yang aktif
    const existingRole = await prisma.role.findFirst({
      where: {
        name: name,
        deleted_at: null,
      },
    });

    if (existingRole) {
      return res.status(409).json({
        success: false,
        message: "Nama role sudah ada",
      });
    }

    // Cek apakah ada nama role yang sudah di soft delete
    const checkDeletedRole = await prisma.role.findFirst({
      where: {
        name: name,
      },
    });

    if (checkDeletedRole && checkDeletedRole.deleted_at) {
      // Restore role yang di soft delete
      const restoredRole = await prisma.role.update({
        where: {
          id: checkDeletedRole.id,
        },
        data: {
          deleted_at: null,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Berhasil mengembalikan role yang dihapus",
        data: restoredRole,
      });
    }

    // Buat data baru
    const newRole = await prisma.role.create({
      data: {
        name: name,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Berhasil menambahkan role",
      data: newRole,
    });
  } catch (error) {
    console.log("Error creating role:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

// UPDATE Role
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validasi input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Nama role wajib diisi",
      });
    }

    // Cek apakah role ada
    const existingRole = await prisma.role.findFirst({
      where: {
        id: parseInt(id),
        deleted_at: null,
      },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: "Role tidak ditemukan",
      });
    }

    // Cek duplikasi nama role
    const duplicateRole = await prisma.role.findFirst({
      where: {
        name: name,
        deleted_at: null,
        NOT: {
          id: parseInt(id),
        },
      },
    });

    if (duplicateRole) {
      return res.status(409).json({
        success: false,
        message: "Nama role sudah ada",
      });
    }

    // Update role
    const updatedRole = await prisma.role.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name: name,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil memperbarui role",
      data: updatedRole,
    });
  } catch (error) {
    console.log("Error updating role:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

// DELETE Role (soft delete)
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah role ada
    const existingRole = await prisma.role.findFirst({
      where: {
        id: parseInt(id),
        deleted_at: null,
      },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: "Role tidak ditemukan",
      });
    }

    // Cek apakah role masih digunakan oleh user
    const usedInUserRole = await prisma.userRole.count({
      where: {
        role_id: parseInt(id),
      },
    });

    if (usedInUserRole > 0) {
      return res.status(400).json({
        success: false,
        message: "Role masih digunakan oleh user",
      });
    }

    // Soft delete role
    await prisma.role.update({
      where: {
        id: parseInt(id),
      },
      data: {
        deleted_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil menghapus role",
    });
  } catch (error) {
    console.log("Error deleting role:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

module.exports = {
  getAllRole,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};