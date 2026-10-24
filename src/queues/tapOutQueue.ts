import { Queue } from 'bullmq'
import connection from '../config/redis'

const tapOutQueue = new Queue('tap-out', { connection })

export interface TapOutJobData {
  siswaId: string
  kelasId: number
  siswaData: { nama: string; kelas?: { kelas: string; jurusan: string; telegram_group_id?: string } }
  receivedAt: string
}

export async function addTapOutJob(data: TapOutJobData) {
  return tapOutQueue.add('process', data, {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: true,
  })
}

export { tapOutQueue }
export default tapOutQueue