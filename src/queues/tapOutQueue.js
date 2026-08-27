const { Queue } = require('bullmq')
const connection = require('../config/redis')

const tapOutQueue = new Queue('tap-out', { connection })

const addTapOutJob = async (data) => {
    await tapOutQueue.add('process', data, {
        attempts: 3,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
    })
}

module.exports = { tapOutQueue, addTapOutJob }
