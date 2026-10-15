const { QueueEvents } = require('bullmq')
const connection = require('../config/redis')

const tapInQueueEvents = new QueueEvents('tap-in', { connection })
const tapOutQueueEvents = new QueueEvents('tap-out', { connection })

module.exports = { tapInQueueEvents, tapOutQueueEvents }