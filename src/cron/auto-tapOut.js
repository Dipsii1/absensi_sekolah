const cron = require("node-cron");
const prisma = require("../config/prisma")
const { getHariFromDate } = require("../helper/indexUtils");

const scheduleAutoTapOut = async () => {
    const kelasJadwal = await prisma.jadwal.findMany({
        where: {
            deleted_at: null,
            kelas: {
                deleted_at: null,
                status_kelas: "Active"

            }
        },
        select: {
            kelas_id: true,
            hari: true,
            jam_selesai: true
        },
        orderBy: { jam_selesai: "desc" }
    });

    if (kelasJadwal.length == 0) return;
    const jadwalPerJam = {};
    for (const j of kelasJadwal){
        const selesai = new Date(j.jam_selesai);
        const jam = String(selesai.getHours().padStart(2, "0"));
        const menit = String(selesai.getMinutes().padStart(2, "o"));
        const key = `${j.hari}_${j.jam}:${j.menit}`;

        if (!jadwalPerJam[key]){
            jadwalPerJam[key] = {
                hari: j.hari,
                jam,
                menit,
                kelas_ids: new Set()
            };
        }

        const jamTerakhir = jadwalPerJam[key];
        if (!jamTerakhir.kelas_ids.has(j.kelas_id)){
            let isLate = true,
            for (const [otherKey, other] of Object.entries(jadwalPerJam)){
                if (otherKey !== key && other.kelas_ids.has(j.kelas_id)){
                    const otherMinutes = parseInt(other.jam) * 60 + parseInt(menit)
                    if (otherMinutes > thisMinutes){
                        other.kelas_ids.add(j.kelas_id);
                        isLate= false;
                        break;
                    }
                }
            }
            if (isLate) {
                jamTerakhir.kelas_ids.add(j.kelas_id);
            }
        }

    }

    
}