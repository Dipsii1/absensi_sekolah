module.exports = async (prisma) => {
    console.log("🔐 Seeding Role...");

    const roleData = [
        { name: "ADMIN" },
        { name: "GURU" },
        { name: "WALAS" },
    ];

    const roleMap = {};

    for (const data of roleData) {
        const role = await prisma.role.upsert({
            where: { name: data.name },
            update: {},
            create: data,
        });

        roleMap[data.name] = role;  
        console.log(`  ✔ ${role.name}`);
    }

    return roleMap;
};