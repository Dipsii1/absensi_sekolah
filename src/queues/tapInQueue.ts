import { Hari } from '@prisma/client'
import { Queue } from 'bullmq'
import connection from '../config/redis'

const tapInQueue = new Queue('tap-in', { connection })

export interface TapInJobData {
  rfidId: number
  siswaId: string
  kelasId: number
  siswaData: { nama: string; kelas?: { kelas: string; jurusan: string; telegram_group_id?: string } }
  receivedAt: string
}

export async function addTapInJob(data: TapInJobData) {
  return tapInQueue.add('process', data, {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: true,
  })
}

export { tapInQueue }
export default tapInQueue