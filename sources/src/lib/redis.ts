import Redis, { RedisOptions } from 'ioredis';
import { handleAll, circuitBreaker, CircuitBreakerPolicy, SamplingBreaker } from 'cockatiel';

// Redis URL. Ex: redis://localhost:6379
// const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const envMobileMode = process.env.NEXT_PUBLIC_MOBILE_ENV || process.env.NEXT_PUBLIC_MOBILE_ENV === 'true' || false;
const redisUrl = process.env.REDIS_URL || '';
const retriesPerRequest = process.env.REDIS_RETIES_PER_REQUEST ? parseInt(process.env.REDIS_RETIES_PER_REQUEST) : 1;
const connTimeout = process.env.REDIS_CONN_TIMEOUT ? parseInt(process.env.REDIS_CONN_TIMEOUT) : 2000;
const redisOpts: RedisOptions = {
    maxRetriesPerRequest: retriesPerRequest,
    connectTimeout: connTimeout,   // connection expired in 2 seconds
    enableReadyCheck: true,

    // Pooling mechanics to optimize connection reuse under high concurrency
    reconnectOnError: (err) => {
        console.error && console.error('❌ [Redis Error] Reconnect on error', err);
        const targetError = 'READONLY';
        if (err.message.slice(0, targetError.length) === targetError) return 2;
        return false;
    }
};

// Singleton Redis
const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined;
    circuitBreaker: CircuitBreakerPolicy | undefined;
};

// =========================================================================
// 🧩 SINGLETON REDIS CONNECTION POOL WITH CONFIGURATION
// =========================================================================
// Graceful Error Interception
if (!envMobileMode && (redisUrl || '').length && !globalForRedis.redis) {
    // INITIALIZE HIGH-PERFORMANCE REDIS CONNECTION POOL
    const instance = new Redis(redisUrl, redisOpts);

    // 💡 HANDLE ERROR: 'Unhandled error event'
    instance.on('error', (err) => {
        console.warn('⚠️ [Redis Warning] Connection refused or lost. '
            + 'System automatically bypassing to Database core layer.', err.message);
    });

    globalForRedis.redis = instance;
}

// =========================================================================
// 🛡️ 2. PRODUCTION-GRADE CIRCUIT BREAKER CONFIGURATION (COCKATIEL NATIVE)
// =========================================================================
if (!envMobileMode && !globalForRedis.circuitBreaker) {
    // Initialize breaker engine
    const samplingBreakerEngine = new SamplingBreaker({
        threshold: 0.5,   // error ratio (50%)
        duration: 10000,  // duration
        minimumRps: 1     // minimum request to initial
    });

    // Initialize circuit breaker with breaker engine
    globalForRedis.circuitBreaker = circuitBreaker(handleAll, {
        halfOpenAfter: 15000,
        breaker: samplingBreakerEngine
    });
}

// =========================================================================
// EXPORT MODULE
// =========================================================================;
export const redis: Redis | undefined = globalForRedis.redis;
export const redisBreaker: CircuitBreakerPolicy | undefined = globalForRedis.circuitBreaker;
