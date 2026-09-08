module.exports = async (prisma, siswaList) => {
    console.log("💳 Seeding RFID...");

    const rfidSiswa = siswaList.slice(0, 10);

    for (let i = 0; i < rfidSiswa.length; i++) {
        const siswa = rfidSiswa[i];
        const uid_rfid = `RFID${String(i + 1).padStart(3, "0")}`;

        const existing = await prisma.rFID.findFirst({
            where: { uid_rfid, deleted_at: null },
        });

        if (!existing) {
            await prisma.rFID.create({
                data: {
                    uid_rfid,
                    siswa_id: siswa.id,
                    is_active: true
                },
            });
        }

        console.log(`  ✔ ${uid_rfid} → ${siswa.nama}`);
    }

    const tanpaRfid = siswaList
        .slice(10)
        .map((s) => s.nama)
        .join(", ");

    console.log(`  ⚠ Tanpa RFID: ${tanpaRfid}`);

    return rfidSiswa;
};