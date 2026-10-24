import { QueueEvents } from 'bullmq'
import connection from '../config/redis'

export const tapInQueueEvents = new QueueEvents('tap-in', { connection })
export const tapOutQueueEvents = new QueueEvents('tap-out', { connection })
