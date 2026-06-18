import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Singleton Redis
const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined;
};

// Graceful Error Interception
if (!globalForRedis.redis) {
    const instance = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,   // connection expired in 2 seconds
    });

    // 💡 HANDLE ERROR: 'Unhandled error event'
    instance.on('error', (err) => {
        console.warn('⚠️ [Redis Warning] Connection refused or lost. System automatically bypassing to Database core layer.', err.message);
    });

    globalForRedis.redis = instance;
}

export const redis = globalForRedis.redis;
