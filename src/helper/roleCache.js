let _roleCache = null;

const getRoleCache = async (prisma) => {
    if (_roleCache) return _roleCache;

    const roles = await prisma.role.findMany({
        where: { deleted_at: null }
    });

    if (!roles.length) {
        throw new Error("Tabel roles kosong.");
    }

    _roleCache = roles.reduce((acc, role) => {
        acc[role.name.toUpperCase()] = {
            id: role.id,
            name: role.name
        };
        return acc;
    }, {});

    return _roleCache;
};

const invalidateRoleCache = () => {
    _roleCache = null;
};

module.exports = {
    getRoleCache,
    invalidateRoleCache
};