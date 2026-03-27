const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Mulai seeding...\n");

    // ─────────────────────────────────────────
    // 1. ROLE
    // ─────────────────────────────────────────
    console.log("🔐 Seeding Role...");

    const roleData = [
        { name: "ADMIN" },
        { name: "GURU" },
    ];

    const roleList = [];
    for (const data of roleData) {
        const role = await prisma.role.upsert({
            where: { name: data.name },
            update: {},
            create: data,
        });
        roleList.push(role);
        console.log(`  ✔ ${role.name}`);
    }

    const roleAdmin = roleList.find((r) => r.name === "ADMIN");
    const roleGuru  = roleList.find((r) => r.name === "GURU");

    // ─────────────────────────────────────────
    // 2. JURUSAN
    // ─────────────────────────────────────────
    console.log("\n📚 Seeding Jurusan...");

    const jurusanData = [
        { nama_jurusan: "Teknik Komputer dan Jaringan" },
        { nama_jurusan: "Rekayasa Perangkat Lunak" },
        { nama_jurusan: "Multimedia" },
        { nama_jurusan: "Akuntansi" },
        { nama_jurusan: "Administrasi Perkantoran" },
    ];

    const jurusanList = [];
    for (const data of jurusanData) {
        const jurusan = await prisma.jurusan.upsert({
            where: { nama_jurusan: data.nama_jurusan },
            update: {},
            create: data,
        });
        jurusanList.push(jurusan);
        console.log(`  ✔ ${jurusan.nama_jurusan}`);
    }

    // ─────────────────────────────────────────
    // 3. TAHUN AJARAN
    // ─────────────────────────────────────────
    console.log("\n📅 Seeding Tahun Ajaran...");

    const tahunData = [
        {
            tahun_ajaran: "2023/2024",
            tanggal_mulai: new Date("2023-07-01"),
            tanggal_selesai: new Date("2024-06-30"),
            is_active: false,
        },
        {
            tahun_ajaran: "2024/2025",
            tanggal_mulai: new Date("2024-07-01"),
            tanggal_selesai: new Date("2025-06-30"),
            is_active: true,
        },
    ];

    const tahunList = [];
    for (const data of tahunData) {
        const tahun = await prisma.tahun.upsert({
            where: { tahun_ajaran: data.tahun_ajaran },
            update: {},
            create: data,
        });
        tahunList.push(tahun);
        console.log(`  ✔ ${tahun.tahun_ajaran} (aktif: ${tahun.is_active})`);
    }

    const tahunAktif = tahunList.find((t) => t.is_active);

    // ─────────────────────────────────────────
    // 4. GURU
    // ─────────────────────────────────────────
    console.log("\n👨‍🏫 Seeding Guru...");

    const guruData = [
        {
            NIP: "198501012010011001",
            nama: "Budi Santoso",
            nomor_telepon: "081234567890",
            alamat: "Jl. Merdeka No. 10, Jakarta",
            tanggal_lahir: new Date("1985-01-01"),
        },
        {
            NIP: "198702152011012002",
            nama: "Siti Rahayu",
            nomor_telepon: "081234567891",
            alamat: "Jl. Sudirman No. 22, Jakarta",
            tanggal_lahir: new Date("1987-02-15"),
        },
        {
            NIP: "199003202012011003",
            nama: "Ahmad Fauzi",
            nomor_telepon: "081234567892",
            alamat: "Jl. Gatot Subroto No. 5, Bandung",
            tanggal_lahir: new Date("1990-03-20"),
        },
        {
            NIP: "199205102013012004",
            nama: "Dewi Lestari",
            nomor_telepon: "081234567893",
            alamat: "Jl. Diponegoro No. 8, Surabaya",
            tanggal_lahir: new Date("1992-05-10"),
        },
        {
            NIP: "198808252014011005",
            nama: "Eko Prasetyo",
            nomor_telepon: "081234567894",
            alamat: "Jl. Ahmad Yani No. 15, Semarang",
            tanggal_lahir: new Date("1988-08-25"),
        },
        {
            NIP: "199107312015012006",
            nama: "Fitri Handayani",
            nomor_telepon: "081234567895",
            alamat: "Jl. Pemuda No. 3, Yogyakarta",
            tanggal_lahir: new Date("1991-07-31"),
        },
    ];

    const guruList = [];
    for (const data of guruData) {
        const guru = await prisma.guru.upsert({
            where: { NIP: data.NIP },
            update: {},
            create: data,
        });
        guruList.push(guru);
        console.log(`  ✔ ${guru.nama} (NIP: ${guru.NIP})`);
    }

    // ─────────────────────────────────────────
    // 5. KELAS
    //    Unique: @@unique([kelas, jurusan_id, tahun_ajaran_id])
    // ─────────────────────────────────────────
    console.log("\n🏫 Seeding Kelas...");

    const kelasData = [
        { kelas: "X",   jurusan_id: jurusanList[0].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[0].id },
        { kelas: "XI",  jurusan_id: jurusanList[0].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[1].id },
        { kelas: "XII", jurusan_id: jurusanList[0].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[2].id },
        { kelas: "X",   jurusan_id: jurusanList[1].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[3].id },
        { kelas: "XI",  jurusan_id: jurusanList[1].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[4].id },
        { kelas: "X",   jurusan_id: jurusanList[2].id, tahun_ajaran_id: tahunAktif.id, walas_id: guruList[5].id },
    ];

    const kelasList = [];
    for (const data of kelasData) {
        const kelas = await prisma.kelas.upsert({
            where: {
                kelas_jurusan_id_tahun_ajaran_id: {
                    kelas: data.kelas,
                    jurusan_id: data.jurusan_id,
                    tahun_ajaran_id: data.tahun_ajaran_id,
                },
            },
            update: {},
            create: data,
        });
        kelasList.push(kelas);
        const j = jurusanList.find((j) => j.id === data.jurusan_id);
        console.log(`  ✔ Kelas ${kelas.kelas} ${j.nama_jurusan}`);
    }

    // ─────────────────────────────────────────
    // 6. MATA PELAJARAN
    //    Tidak ada @unique di schema, pakai findFirst
    // ─────────────────────────────────────────
    console.log("\n📖 Seeding Mata Pelajaran...");

    const mapelNama = [
        "Matematika",
        "Bahasa Indonesia",
        "Bahasa Inggris",
        "Fisika",
        "Pemrograman Web",
        "Jaringan Komputer",
        "Basis Data",
        "Desain Grafis",
    ];

    const mapelList = [];
    for (const nama_mapel of mapelNama) {
        const existing = await prisma.mataPelajaran.findFirst({
            where: { nama_mapel, deleted_at: null },
        });
        const mapel = existing
            ? existing
            : await prisma.mataPelajaran.create({ data: { nama_mapel } });
        mapelList.push(mapel);
        console.log(`  ✔ ${mapel.nama_mapel}`);
    }

    // ─────────────────────────────────────────
    // 7. JADWAL
    //    Unique: @@unique([kelas_id, hari, jam_mulai])
    //    Penting: satu guru tidak boleh mengajar 2 kelas di waktu yang sama
    // ─────────────────────────────────────────
    console.log("\n🗓️  Seeding Jadwal...");

    // Helper buat DateTime bertipe Time(6)
    const jam = (hh, mm) =>
        new Date(`1970-01-01T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`);

    const jadwalData = [
        // ── Kelas X TKJ (kelasList[0]) ───────────────────
        { hari: "SENIN",  kelas_id: kelasList[0].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(7,0),  jam_selesai: jam(8,30)  },
        { hari: "SENIN",  kelas_id: kelasList[0].id, mapel_id: mapelList[5].id, guru_id: guruList[2].id, jam_mulai: jam(8,30), jam_selesai: jam(10,0)  },
        { hari: "SELASA", kelas_id: kelasList[0].id, mapel_id: mapelList[1].id, guru_id: guruList[1].id, jam_mulai: jam(7,0),  jam_selesai: jam(8,30)  },
        { hari: "SELASA", kelas_id: kelasList[0].id, mapel_id: mapelList[3].id, guru_id: guruList[3].id, jam_mulai: jam(8,30), jam_selesai: jam(10,0)  },
        { hari: "RABU",   kelas_id: kelasList[0].id, mapel_id: mapelList[2].id, guru_id: guruList[4].id, jam_mulai: jam(7,0),  jam_selesai: jam(8,30)  },
        { hari: "KAMIS",  kelas_id: kelasList[0].id, mapel_id: mapelList[6].id, guru_id: guruList[5].id, jam_mulai: jam(7,0),  jam_selesai: jam(8,30)  },

        // ── Kelas XI TKJ (kelasList[1]) ──────────────────
        { hari: "SENIN",  kelas_id: kelasList[1].id, mapel_id: mapelList[3].id, guru_id: guruList[3].id, jam_mulai: jam(10,0), jam_selesai: jam(11,30) },
        { hari: "SELASA", kelas_id: kelasList[1].id, mapel_id: mapelList[5].id, guru_id: guruList[2].id, jam_mulai: jam(10,0), jam_selesai: jam(11,30) },
        { hari: "RABU",   kelas_id: kelasList[1].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(8,30), jam_selesai: jam(10,0)  },

        // ── Kelas XII TKJ (kelasList[2]) ─────────────────
        { hari: "SENIN",  kelas_id: kelasList[2].id, mapel_id: mapelList[2].id, guru_id: guruList[4].id, jam_mulai: jam(8,30), jam_selesai: jam(10,0)  },
        { hari: "RABU",   kelas_id: kelasList[2].id, mapel_id: mapelList[1].id, guru_id: guruList[1].id, jam_mulai: jam(8,30), jam_selesai: jam(10,0)  },
        { hari: "JUMAT",  kelas_id: kelasList[2].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(7,0),  jam_selesai: jam(8,30)  },

        // ── Kelas X RPL (kelasList[3]) ───────────────────
        { hari: "SENIN",  kelas_id: kelasList[3].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(11,30),jam_selesai: jam(13,0)  },
        { hari: "SELASA", kelas_id: kelasList[3].id, mapel_id: mapelList[6].id, guru_id: guruList[3].id, jam_mulai: jam(7,0),  jam_selesai: jam(8,30)  },
        { hari: "RABU",   kelas_id: kelasList[3].id, mapel_id: mapelList[0].id, guru_id: guruList[0].id, jam_mulai: jam(11,30),jam_selesai: jam(13,0)  },

        // ── Kelas XI RPL (kelasList[4]) ──────────────────
        { hari: "SELASA", kelas_id: kelasList[4].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(8,30), jam_selesai: jam(10,0)  },
        { hari: "KAMIS",  kelas_id: kelasList[4].id, mapel_id: mapelList[7].id, guru_id: guruList[2].id, jam_mulai: jam(7,0),  jam_selesai: jam(8,30)  },

        // ── Kelas X Multimedia (kelasList[5]) ────────────
        { hari: "SENIN",  kelas_id: kelasList[5].id, mapel_id: mapelList[7].id, guru_id: guruList[2].id, jam_mulai: jam(13,0), jam_selesai: jam(14,30) },
        { hari: "RABU",   kelas_id: kelasList[5].id, mapel_id: mapelList[4].id, guru_id: guruList[5].id, jam_mulai: jam(10,0), jam_selesai: jam(11,30) },
    ];

    const jadwalList = [];
    for (const data of jadwalData) {
        const existing = await prisma.jadwal.findFirst({
            where: {
                kelas_id: data.kelas_id,
                hari: data.hari,
                jam_mulai: data.jam_mulai,
                deleted_at: null,
            },
        });
        const jadwal = existing ? existing : await prisma.jadwal.create({ data });
        jadwalList.push(jadwal);

        const mapel  = mapelList.find((m) => m.id === data.mapel_id);
        const kelas  = kelasList.find((k) => k.id === data.kelas_id);
        const jurusan = jurusanList.find((j) => j.id === kelas.jurusan_id);
        const hh = data.jam_mulai.getUTCHours().toString().padStart(2, "0");
        const mm = data.jam_mulai.getUTCMinutes().toString().padStart(2, "0");
        console.log(
            `  ✔ ${data.hari.padEnd(7)} ${hh}:${mm} | ${mapel.nama_mapel.padEnd(22)} | ${kelas.kelas} ${jurusan.nama_jurusan}`
        );
    }

    // ─────────────────────────────────────────
    // 8. ORANG TUA
    // ─────────────────────────────────────────
    console.log("\n👨‍👩‍👧 Seeding Orang Tua...");

    const orangTuaData = [
        { nama_orangtua: "Hendra Wijaya",  nomor_telepon: "081300000001" },
        { nama_orangtua: "Sri Mulyani",    nomor_telepon: "081300000002" },
        { nama_orangtua: "Bambang Susilo", nomor_telepon: "081300000003" },
        { nama_orangtua: "Yuliani Putri",  nomor_telepon: "081300000004" },
        { nama_orangtua: "Agus Salim",     nomor_telepon: "081300000005" },
        { nama_orangtua: "Nurhasanah",     nomor_telepon: "081300000006" },
        { nama_orangtua: "Darmanto",       nomor_telepon: "081300000007" },
        { nama_orangtua: "Wulandari",      nomor_telepon: "081300000008" },
        { nama_orangtua: "Sugiono",        nomor_telepon: "081300000009" },
        { nama_orangtua: "Ratna Sari",     nomor_telepon: "081300000010" },
        { nama_orangtua: "Kurniawan",      nomor_telepon: "081300000011" },
        { nama_orangtua: "Mardiyah",       nomor_telepon: "081300000012" },
    ];

    const orangTuaList = [];
    for (const data of orangTuaData) {
        const existing = await prisma.orangTua.findFirst({
            where: { nomor_telepon: data.nomor_telepon, deleted_at: null },
        });
        const ot = existing ? existing : await prisma.orangTua.create({ data });
        orangTuaList.push(ot);
        console.log(`  ✔ ${ot.nama_orangtua}`);
    }

    // ─────────────────────────────────────────
    // 9. SISWA
    //    gender: "L" | "P"  ← sesuai enum Gender di schema
    //    id: UUID auto-generated
    // ─────────────────────────────────────────
    console.log("\n🎒 Seeding Siswa...");

    const siswaData = [
        // Kelas X TKJ — 4 siswa
        { NISN: "0051234001", NIPD: "24001", nama: "Andi Kurniawan",  alamat: "Jl. Mawar No. 1, Jakarta",         gender: "L", tanggal_lahir: new Date("2007-03-15"), nomor_telepon: "081400000001", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[0].id  },
        { NISN: "0051234002", NIPD: "24002", nama: "Bagas Pratama",   alamat: "Jl. Melati No. 2, Jakarta",        gender: "L", tanggal_lahir: new Date("2007-05-20"), nomor_telepon: "081400000002", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[1].id  },
        { NISN: "0051234003", NIPD: "24003", nama: "Citra Dewi",      alamat: "Jl. Anggrek No. 3, Jakarta",       gender: "P", tanggal_lahir: new Date("2007-08-10"), nomor_telepon: "081400000003", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[2].id  },
        { NISN: "0051234004", NIPD: "24004", nama: "Dita Ramadhani",  alamat: "Jl. Kenanga No. 4, Depok",         gender: "P", tanggal_lahir: new Date("2007-11-25"), nomor_telepon: "081400000004", kelas_id: kelasList[0].id, orangtua_id: orangTuaList[3].id  },
        // Kelas XI TKJ — 3 siswa
        { NISN: "0051234005", NIPD: "23005", nama: "Eka Saputra",     alamat: "Jl. Dahlia No. 5, Bogor",          gender: "L", tanggal_lahir: new Date("2006-02-14"), nomor_telepon: "081400000005", kelas_id: kelasList[1].id, orangtua_id: orangTuaList[4].id  },
        { NISN: "0051234006", NIPD: "23006", nama: "Fira Aulia",      alamat: "Jl. Flamboyan No. 6, Bekasi",      gender: "P", tanggal_lahir: new Date("2006-06-30"), nomor_telepon: "081400000006", kelas_id: kelasList[1].id, orangtua_id: orangTuaList[5].id  },
        { NISN: "0051234007", NIPD: "23007", nama: "Galang Permana",  alamat: "Jl. Nusa Indah No. 7, Bekasi",     gender: "L", tanggal_lahir: new Date("2006-09-03"), nomor_telepon: "081400000007", kelas_id: kelasList[1].id, orangtua_id: orangTuaList[6].id  },
        // Kelas XII TKJ — 2 siswa
        { NISN: "0051234008", NIPD: "22008", nama: "Hana Pertiwi",    alamat: "Jl. Bougenville No. 8, Tangerang", gender: "P", tanggal_lahir: new Date("2005-12-05"), nomor_telepon: "081400000008", kelas_id: kelasList[2].id, orangtua_id: orangTuaList[7].id  },
        { NISN: "0051234009", NIPD: "22009", nama: "Irfan Hakim",     alamat: "Jl. Tulip No. 9, Bekasi",          gender: "L", tanggal_lahir: new Date("2005-04-18"), nomor_telepon: "081400000009", kelas_id: kelasList[2].id, orangtua_id: orangTuaList[8].id  },
        // Kelas X RPL — 2 siswa
        { NISN: "0051234010", NIPD: "24010", nama: "Julia Safitri",   alamat: "Jl. Kamboja No. 10, Depok",        gender: "P", tanggal_lahir: new Date("2007-07-08"), nomor_telepon: "081400000010", kelas_id: kelasList[3].id, orangtua_id: orangTuaList[9].id  },
        { NISN: "0051234011", NIPD: "24011", nama: "Kevin Alfarizi",  alamat: "Jl. Seruni No. 11, Jakarta",       gender: "L", tanggal_lahir: new Date("2007-01-22"), nomor_telepon: "081400000011", kelas_id: kelasList[3].id, orangtua_id: orangTuaList[10].id },
        // Kelas X Multimedia — 1 siswa
        { NISN: "0051234012", NIPD: "24012", nama: "Laila Nurmaya",   alamat: "Jl. Teratai No. 12, Bogor",        gender: "P", tanggal_lahir: new Date("2007-10-14"), nomor_telepon: "081400000012", kelas_id: kelasList[5].id, orangtua_id: orangTuaList[11].id },
    ];

    const siswaList = [];
    for (const data of siswaData) {
        const existing = await prisma.siswa.findFirst({
            where: { NISN: data.NISN, deleted_at: null },
        });
        const siswa = existing ? existing : await prisma.siswa.create({ data });
        siswaList.push(siswa);
        console.log(`  ✔ ${siswa.nama} (${siswa.gender}) | NISN: ${siswa.NISN}`);
    }

    // ─────────────────────────────────────────
    // 10. RFID
    //     siswa_id: String (UUID) — sesuai schema
    //     10 dari 12 siswa punya RFID
    // ─────────────────────────────────────────
    console.log("\n💳 Seeding RFID...");

    const rfidSiswa = siswaList.slice(0, 10);
    for (let i = 0; i < rfidSiswa.length; i++) {
        const siswa = rfidSiswa[i];
        const uid_rfid = `RFID${String(i + 1).padStart(6, "0")}`;

        const existing = await prisma.rFID.findFirst({
            where: { uid_rfid, deleted_at: null },
        });
        if (!existing) {
            await prisma.rFID.create({
                data: { uid_rfid, siswa_id: siswa.id, is_active: true },
            });
        }
        console.log(`  ✔ ${uid_rfid} → ${siswa.nama}`);
    }

    const tanpaRfid = siswaList.slice(10).map((s) => s.nama).join(", ");
    console.log(`  ⚠ Tanpa RFID: ${tanpaRfid}`);

    // ─────────────────────────────────────────
    // 11. ABSENSI SISWA + DETAIL ABSENSI
    //     @@unique([siswa_id, tanggal]) di AbsensiSiswa
    //     Simulasi absensi hari ini (skip jika Minggu)
    // ─────────────────────────────────────────
    console.log("\n📋 Seeding Absensi Siswa...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hariMap = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
    const hariIni = hariMap[today.getDay()];

    if (hariIni === "MINGGU") {
        console.log("  ⚠ Hari ini Minggu, skip seeding absensi.");
    } else {
        // 8 siswa pertama (semua punya RFID)
        const siswaHariIni = siswaList.slice(0, 8);

        for (let i = 0; i < siswaHariIni.length; i++) {
            const siswa = siswaHariIni[i];

            // tap in: 06:45 … 07:30 dengan interval 5 menit
            const tapInDate = new Date(today);
            tapInDate.setHours(6, 45 + i * 5, 0, 0);
            const statusTapIn = tapInDate.getHours() < 7 ? "TEPAT_WAKTU" : "TELAMBAT";

            // tap out: 14:00 … 14:35
            const tapOutDate = new Date(today);
            tapOutDate.setHours(14, i * 5, 0, 0);

            const rfid = await prisma.rFID.findFirst({
                where: { siswa_id: siswa.id, is_active: true, deleted_at: null },
            });

            // @@unique([siswa_id, tanggal]) → cukup cek dengan findUnique
            const existingAbsensi = await prisma.absensiSiswa.findFirst({
                where: { siswa_id: siswa.id, tanggal: today, deleted_at: null },
            });

            const absensi = existingAbsensi
                ? existingAbsensi
                : await prisma.absensiSiswa.create({
                    data: {
                        siswa_id: siswa.id,
                        tanggal: today,
                        tap_in: tapInDate,
                        tap_out: tapOutDate,
                        rfid_id: rfid?.id ?? null,
                        status_tapin: statusTapIn,
                    },
                });

            console.log(
                `  ✔ ${siswa.nama.padEnd(18)} tap_in: ${tapInDate.toTimeString().slice(0, 5)} | ${statusTapIn}`
            );

            // ── Detail Absensi per Jadwal hari ini ───────
            const jadwalHariIni = await prisma.jadwal.findMany({
                where: { kelas_id: siswa.kelas_id, hari: hariIni, deleted_at: null },
                orderBy: { jam_mulai: "asc" },
            });

            // Tentukan status per siswa (variasi data)
            const statusMap = ["HADIR", "HADIR", "HADIR", "HADIR", "HADIR", "HADIR", "IZIN", "ALPHA"];
            const statusSiswa = statusMap[i];

            for (const jadwal of jadwalHariIni) {
                const existingDetail = await prisma.detailAbsensiSiswa.findFirst({
                    where: { absensi_id: absensi.id, jadwal_id: jadwal.id, deleted_at: null },
                });

                if (!existingDetail) {
                    await prisma.detailAbsensiSiswa.create({
                        data: {
                            absensi_id: absensi.id,
                            jadwal_id: jadwal.id,
                            guru_id: jadwal.guru_id,
                            status: statusSiswa,
                            jam_absen: tapInDate,
                            keterangan:
                                statusSiswa === "IZIN"  ? "Izin keperluan keluarga" :
                                statusSiswa === "SAKIT" ? "Surat keterangan dokter" :
                                null,
                        },
                    });
                    console.log(`     └─ Jadwal #${jadwal.id} (${hariIni}) → ${statusSiswa}`);
                }
            }
        }
    }

    // ─────────────────────────────────────────
    // 12. USER
    //     role_id (FK ke tabel roles) — bukan field string
    //     guru_id: Int? @unique
    // ─────────────────────────────────────────
    console.log("\n👤 Seeding Users...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    const userData = [
        { email: "admin@sekolah.sch.id",           role_id: roleAdmin.id, guru_id: null           },
        { email: "budi.santoso@sekolah.sch.id",    role_id: roleGuru.id,  guru_id: guruList[0].id },
        { email: "siti.rahayu@sekolah.sch.id",     role_id: roleGuru.id,  guru_id: guruList[1].id },
        { email: "ahmad.fauzi@sekolah.sch.id",     role_id: roleGuru.id,  guru_id: guruList[2].id },
        { email: "dewi.lestari@sekolah.sch.id",    role_id: roleGuru.id,  guru_id: guruList[3].id },
        { email: "eko.prasetyo@sekolah.sch.id",    role_id: roleGuru.id,  guru_id: guruList[4].id },
        { email: "fitri.handayani@sekolah.sch.id", role_id: roleGuru.id,  guru_id: guruList[5].id },
    ];

    for (const data of userData) {
        const existing = await prisma.user.findFirst({
            where: { email: data.email, deleted_at: null },
        });
        if (!existing) {
            await prisma.user.create({
                data: { ...data, password: hashedPassword },
            });
        }
        const label = data.role_id === roleAdmin.id ? "ADMIN" : "GURU ";
        console.log(`  ✔ ${label} | ${data.email}`);
    }

    // ─────────────────────────────────────────
    // RINGKASAN
    // ─────────────────────────────────────────
    console.log("\n✅ Seeding selesai!\n");
    console.log("═══════════════════════════════════════════════════");
    console.log("📊 Ringkasan:");
    console.log(`   Role           : ${roleList.length}`);
    console.log(`   Jurusan        : ${jurusanList.length}`);
    console.log(`   Tahun Ajaran   : ${tahunList.length}  (aktif: 2024/2025)`);
    console.log(`   Guru           : ${guruList.length}`);
    console.log(`   Kelas          : ${kelasList.length}`);
    console.log(`   Mata Pelajaran : ${mapelList.length}`);
    console.log(`   Jadwal         : ${jadwalList.length}`);
    console.log(`   Orang Tua      : ${orangTuaList.length}`);
    console.log(`   Siswa          : ${siswaList.length}  (${rfidSiswa.length} punya RFID)`);
    console.log(`   Users          : ${userData.length}  (1 admin + ${userData.length - 1} guru)`);
    console.log("═══════════════════════════════════════════════════");
    console.log("\n🔑 Akun Login (semua password: password123)");
    console.log("   admin@sekolah.sch.id            → ADMIN");
    console.log("   budi.santoso@sekolah.sch.id     → GURU");
    console.log("   siti.rahayu@sekolah.sch.id      → GURU");
    console.log("   ahmad.fauzi@sekolah.sch.id      → GURU");
    console.log("   dewi.lestari@sekolah.sch.id     → GURU");
    console.log("   eko.prasetyo@sekolah.sch.id     → GURU");
    console.log("   fitri.handayani@sekolah.sch.id  → GURU");
}

main()
    .catch((e) => {
        console.error("❌ Error saat seeding:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });