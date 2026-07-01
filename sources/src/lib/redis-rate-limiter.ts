import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// =========================================================================
// 📡 DISTRIBUTED REDIS RATE LIMITER ENTERPRISE SERVICE SUBSYSTEM
// =========================================================================
/**
 * Stateful cluster-wide rate limiting engine powered by Upstash Redis REST protocol.
 * Safely executes inside Next.js Edge Runtime to synchronize quotas across all scaling pods [3.2, 5.1].
 */
export class UpstashRedisRateLimiterService {
    private ratelimitEngine: Ratelimit;
    private maxRequests: number;
    private windowSeconds: number;

    /**
     * Establishes the serverless Redis agent connection and compiles dynamic system bounds.
     */
    constructor(url: string, token: string, maxRequests?: number, timeoutPerRequestInMs?: number) {
        this.maxRequests = maxRequests || 10;
        this.windowSeconds = timeoutPerRequestInMs || 10;

        // Validate existence of critical serverless connection tokens before initializing context
        if (!(url || '').length || !(token || '').length) {
            throw new Error("🚨 [RedisRateLimiterService] Critical configuration missing: URL or TOKEN is not defined!");
        }

        // Initialize stateful remote serverless REST client connection agent
        const redisAgent = new Redis({ url, token });

        // Instantiate sliding window algorithm subsystem for real-time synchronization across nodes
        this.ratelimitEngine = new Ratelimit({
            redis: redisAgent,
            limiter: Ratelimit.slidingWindow(this.maxRequests, `${this.windowSeconds} s`),
            analytics: true, // Automatically populates Upstash data dashboard metrics graphs [4.2]
        });

        console.log(`📡 [RedisRateLimiterService] Established Cluster-Wide Boundary: ${this.maxRequests} req / ${this.windowSeconds}s`);
    }

    /**
     * Authenticates client connection state against cluster quotas over a serverless connection path.
     * @param {string} ip - Unmasked real client network layer address string.
     */
    public async checkRateLimit(ip: string): Promise<{
        status?: number;
        error?: {
            message?: string;
            rateLimitLimit?: number,
            rateLimitRemaining?: number,
            headers?: any
        }
    }> {
        // 🔥 ATOMIC STATE EVALUATION: Query distributed cache cluster over HTTP REST within ~1-3ms
        const { success, limit, remaining, reset } = await this.ratelimitEngine.limit(ip);

        // KICH BẢN A: Stateful distributed analysis validates usage within safe margins -> Allow packet
        if (success) return { status: 200 }; // Return null (Green Light) to transfer execution pipeline to downstream handlers

        // KICH BẢN B: Client signature violates cluster system bounds -> Terminate transaction path
        console.warn(`🛡️ [Cluster Perimeter Active] Denied packet stream. Distributed quota exceeded for IP: ${ip}`);

        const currentTime = Date.now();
        const retryAfterSeconds = Math.max(1, Math.ceil((reset - currentTime) / 1000));

        // Compile stateful distributed telemetry data into standard HTTP 429 JSON response payload
        return {
            status: 429,
            error: {
                message: 'Distributed rate limit exceeded. Cluster capacity protection activated.',
                rateLimitLimit: limit,
                rateLimitRemaining: remaining,
                headers: {
                    'Retry-After': retryAfterSeconds.toString(),
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'X-RateLimit-Reset': reset.toString(),
                    'X-RateLimit-Address': ip,
                }
            }
        };
    }
}

// 👑 SINGLETON ARCHITECTURE BINDING: Protect stateful memory allocation across Next.js reloads
const globalForRateLimiter = globalThis as unknown as {
    rateLimiterInstance: UpstashRedisRateLimiterService | undefined
};

const USE_UPSTASH_RATE_LIMITER = process.env.UPSTASH_RATE_LIMITER || false;
if (USE_UPSTASH_RATE_LIMITER && !globalForRateLimiter.rateLimiterInstance) {
    const RATE_LIMITER_MAX_REQUESTS = parseInt(process.env.UPSTASH_RATE_LIMIT_REQUESTS || '5');
    const RATE_LIMITER_TIMEOUT_PER_REQUEST = parseInt(process.env.UPSTASH_RATE_LIMIT_TIMEOUT_PER_REQUEST || '10');
    const RATE_LIMITER_URL = process.env.UPSTASH_RATE_LIMIT_URL || '';
    const RATE_LIMITER_TOKEN = process.env.UPSTASH_RATE_LIMIT_TOKEN || '';
    globalForRateLimiter.rateLimiterInstance = new UpstashRedisRateLimiterService(
        RATE_LIMITER_URL, RATE_LIMITER_TOKEN,
        !isNaN(RATE_LIMITER_MAX_REQUESTS) && RATE_LIMITER_MAX_REQUESTS > 0 ? RATE_LIMITER_MAX_REQUESTS : 5,
        !isNaN(RATE_LIMITER_TIMEOUT_PER_REQUEST) && RATE_LIMITER_TIMEOUT_PER_REQUEST > 0 ? RATE_LIMITER_TIMEOUT_PER_REQUEST : 10);
}

// =========================================================================
// EXPORT MODULE
// =========================================================================;
export const upstashRedisRateLimiter: UpstashRedisRateLimiterService = globalForRateLimiter.rateLimiterInstance;
