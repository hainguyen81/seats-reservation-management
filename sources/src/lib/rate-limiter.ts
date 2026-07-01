import { memoryRateLimiter } from './memory-rate-limiter';
import { extractClientIp } from './request-helper';
import { upstashRedisRateLimiter } from './redis-rate-limiter';

// =========================================================================
// 🚀 METHOD 1: STRATEGY DESIGN FOR PURE IN-MEMORY RATE LIMITING
// =========================================================================
const handleMemoryRateLimit = async (req: Request): Promise<{
    status?: number;
    error?: {
        message?: string;
        rateLimitLimit?: number,
        rateLimitRemaining?: number,
        headers?: any
    }
}> {
    const clientIp = extractClientIp(req);
    return memoryRateLimiter ? await memoryRateLimiter.checkRateLimit(clientIp) : { status: 200 };
}

// =========================================================================
// 🚀 METHOD 2: STRATEGY DESIGN FOR ENTERPRISE HYBRID DISTRIBUTED RATE LIMITING
// =========================================================================
const handleHybridRateLimit = async(req: Request): Promise<{
    status?: number;
    error?: {
        message?: string;
        rateLimitLimit?: number,
        rateLimitRemaining?: number,
        headers?: any
    }
}> {
    const clientIp = extractClientIp(req);
    return upstashRedisRateLimiter ? await upstashRedisRateLimiter.checkRateLimit(clientIp) : { status: 200 };
}

// =========================================================================
// 🚀 FINAL: HANDLING RATE LIMITING
// =========================================================================
export const handleRateLimit = async (req: Request): Promise<{
    status?: number;
    error?: {
        message?: string;
        rateLimitLimit?: number,
        rateLimitRemaining?: number,
        headers?: any
    }
}> {
    let rateLimitResult = await handleMemoryRateLimit(req);
    if (!rateLimitResult || rateLimitResult?.status === 200) {
        rateLimitResult = await handleHybridRateLimit(req);
    }
    return rateLimitResult;
}