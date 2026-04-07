const bcrypt = require("bcrypt");

module.exports = async (prisma, roleMap, guruList) => {
  console.log("Seeding Users...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  const userData = [
    {
      email: "admin@sekolah.sch.id",
      roles: ["ADMIN"],
      guru_id: null,
    },
    {
      email: "budi.santoso@sekolah.sch.id",
      roles: ["GURU"],
      guru_id: guruList[0].id,
    },
    {
      email: "siti.rahayu@sekolah.sch.id",
      roles: ["GURU"],
      guru_id: guruList[1].id,
    },
    {
      email: "ahmad.fauzi@sekolah.sch.id",
      roles: ["GURU"],
      guru_id: guruList[2].id,
    },
    {
      email: "dewi.lestari@sekolah.sch.id",
      roles: ["GURU"],
      guru_id: guruList[3].id,
    },
    {
      email: "eko.prasetyo@sekolah.sch.id",
      roles: ["GURU"],
      guru_id: guruList[4].id,
    },
    {
      email: "fitri.handayani@sekolah.sch.id",
      roles: ["GURU"],
      guru_id: guruList[5].id,
    },
    {
      email: "satrio.handayani@sekolah.sch.id",
      roles: ["GURU", "WALAS"],
      guru_id: guruList[6]?.id || null,
    },
  ];

  for (const data of userData) {
    let user = await prisma.user.findFirst({
      where: { email: data.email, deleted_at: null },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          guru_id: data.guru_id,
        },
      });
    }

    for (const roleName of data.roles) {
      const role = roleMap[roleName];

      const existingRole = await prisma.userRole.findUnique({
        where: {
          user_id_role_id: {
            user_id: user.id,
            role_id: role.id,
          },
        },
      });

      if (!existingRole) {
        await prisma.userRole.create({
          data: {
            user_id: user.id,
            role_id: role.id,
          },
        });
      }
    }

    console.log(`${data.roles.join(", ")} | ${data.email}`);
  }
};