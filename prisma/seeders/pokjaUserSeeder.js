module.exports = async (prisma, userList) => {
    console.log("👥 Seeding Pokja User...");

    const pokjaUsers = [
        { username: "budi.santoso" },
        { username: "siti.rahayu" },
        { username: "ahmad.fauzi" },
    ];

    const pokjaList = [];

    for (const data of pokjaUsers) {
        const user = userList.find((u) => u.username === data.username);

        if (!user) {
            console.log(`  ⚠ User ${data.username} tidak ditemukan, skip`);
            continue;
        }

        const existing = await prisma.pokjaUser.findUnique({
            where: { user_id: user.id },
        });

        if (!existing) {
            const pokja = await prisma.pokjaUser.create({
                data: {
                    user_id: user.id,
                },
            });
            pokjaList.push(pokja);
            console.log(`  ✔ ${data.username} → Pokja`);
        } else {
            pokjaList.push(existing);
            console.log(`  ✔ ${data.username} → Pokja (exists)`);
        }
    }

    return pokjaList;
};
