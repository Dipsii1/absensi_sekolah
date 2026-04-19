module.exports = async (prisma) => {
    console.log("🔐 Seeding Role...");

    const roleData = [
        { name: "SUPER_ADMIN" },
        { name: "ADMIN" },
        { name: "GURU" },
        { name: "WALAS" },
        { name: "KESISWAAN" },
    ];

    const roleMap = {};

    for (const data of roleData) {
        let role = await prisma.role.findFirst({
            where: { name: data.name },
        });

        if (role) {
            if (role.deleted_at) {
                role = await prisma.role.update({
                    where: { id: role.id },
                    data:  { deleted_at: null },
                });
                console.log(`  ♻ ${role.name} (restored)`);
            } else {
                console.log(`  ✔ ${role.name} (exists)`);
            }
        } else {
            role = await prisma.role.create({ data });
            console.log(`  ✔ ${role.name} (created)`);
        }

        roleMap[data.name] = role;
    }

    return roleMap;
};