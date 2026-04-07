const bcrypt = require("bcrypt");

module.exports = async (prisma, roleMap, guruList) => {

    console.log("👤 Seeding Users...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    const userData = [
        { email: "admin@sekolah.sch.id",           role: "ADMIN", guru_id: null },
        { email: "budi.santoso@sekolah.sch.id",    role: "GURU",  guru_id: guruList[0].id },
        { email: "siti.rahayu@sekolah.sch.id",     role: "GURU",  guru_id: guruList[1].id },
        { email: "ahmad.fauzi@sekolah.sch.id",     role: "GURU",  guru_id: guruList[2].id },
        { email: "dewi.lestari@sekolah.sch.id",    role: "GURU",  guru_id: guruList[3].id },
        { email: "eko.prasetyo@sekolah.sch.id",    role: "GURU",  guru_id: guruList[4].id },
        { email: "fitri.handayani@sekolah.sch.id", role: "GURU",  guru_id: guruList[5].id },
        { email: "satrio.handayani@sekolah.sch.id", role: "WALAS",  guru_id: null }
    ];

    for (const data of userData) {
        const existing = await prisma.user.findFirst({
            where: { email: data.email, deleted_at: null },
        });

        if (!existing) {
            await prisma.user.create({
                data: {
                    email: data.email,
                    password: hashedPassword,
                    role_id: roleMap[data.role].id,  
                    guru_id: data.guru_id,
                },
            });
        }

        console.log(`  ✔ ${data.role} | ${data.email}`);
    }
};