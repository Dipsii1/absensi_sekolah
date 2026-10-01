const IORedis = require('ioredis')

const connection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
})

connection.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message)
})

connection.on('connect', () => {
    console.log('[Redis] Connected to', process.env.REDIS_HOST || '127.0.0.1')
})

module.exports = connection
