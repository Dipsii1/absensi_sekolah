const { Queue } = require('bullmq')
const connection = require('../config/redis')

const tapOutQueue = new Queue('tap-out', { connection })

const addTapOutJob = async (data) => {
    return tapOutQueue.add('process', data, {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
    })
}

module.exports = { tapOutQueue, addTapOutJob }