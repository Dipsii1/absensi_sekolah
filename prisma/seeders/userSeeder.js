const bcrypt = require("bcrypt");

module.exports = async (prisma, roleMap, guruList) => {
  console.log("Seeding Users...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  const userData = [
    {
      username: "superadmin",
      email: "superAdmin@sekolah.sch.id",
      roles: ["SUPER_ADMIN"],
      guru_id: null,
    },
    {
      username: "admin",
      email: "admin@sekolah.sch.id",
      roles: ["ADMIN"],
      guru_id: null,
    },
    {
      username: "budi.santoso",
      email: "budi.santoso@sekolah.sch.id",
      roles: ["GURU"],
      guru_id: guruList[0].id,
    },
    {
      username: "siti.rahayu",
      email: "siti.rahayu@sekolah.sch.id",
      roles: ["GURU"],
      guru_id: guruList[1].id,
    },
    {
      username: "ahmad.fauzi",
      email: "ahmad.fauzi@sekolah.sch.id",
      roles: ["GURU"],
      guru_id: guruList[2].id,
    },
    {
      username: "dewi.lestari",
      email: "dewi.lestari@sekolah.sch.id",
      roles: ["GURU"],
      guru_id: guruList[3].id,
    },
    {
      username: "eko.prasetyo",
      email: "eko.prasetyo@sekolah.sch.id",
      roles: ["GURU"],
      guru_id: guruList[4].id,
    },
    {
      username: "fitri.handayani",
      email: "fitri.handayani@sekolah.sch.id",
      roles: ["GURU", "WALAS"],
      guru_id: guruList[5].id,
    },
    {
      username: "satrio.handayani",
      email: "satrio.handayani@sekolah.sch.id",
      roles: ["GURU", "WALAS"],
      guru_id: guruList[6]?.id || null,
    },
  ];

  const userList = [];

  for (const data of userData) {
    let user = await prisma.user.findFirst({
      where: { email: data.email, deleted_at: null },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: data.username,
          email: data.email,
          password: hashedPassword,
          guru_id: data.guru_id,
        },
      });
    }

    userList.push(user);

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

    console.log(`${data.roles.join(", ")} | ${data.username} | ${data.email}`);
  }

  return userList;
};