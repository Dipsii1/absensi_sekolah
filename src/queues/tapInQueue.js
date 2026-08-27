const { Queue } = require('bullmq')
const connection = require('../config/redis')

const tapInQueue = new Queue('tap-in', { connection })

const addTapInJob = async (data) => {
    await tapInQueue.add('process', data, {
        attempts: 3,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
    })
}

module.exports = { tapInQueue, addTapInJob }
