const { Queue } = require('bullmq')
const connection = require('../config/redis')

const tapInQueue = new Queue('tap-in', { connection })

const addTapInJob = async (data) => {
    return tapInQueue.add('process', data, {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
    })
}

module.exports = { tapInQueue, addTapInJob }