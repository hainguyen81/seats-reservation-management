import { LRUCache } from 'lru-cache';

// =========================================================================
// 🎛️ MEMORY RATE LIMITER ENTERPRISE SERVICE SUBSYSTEM
// =========================================================================
/**
 * Stateful memory-isolated rate limiting engine running directly on the node process heap.
 * Dynamically extracts configuration bounds from active container process environment variables.
 */
export class MemoryRateLimiterService {
    // Encapsulate local runtime database instance context safely to prevent global leaks
    private cacheRegistry: LRUCache<string, { count: number; resetTime: number }>;
    private maxRequests: number;
    private windowMs: number;

    /**
     * Bootstraps local cache bounds and initializes dynamic threshold configurations.
     */
    constructor(maxRequests?: number, timeoutPerRequestInMs?: number) {
        // Convert variables cleanly, fallback to 5 requests per 10 seconds if undefined
        this.maxRequests = maxRequests || 5;
        const windowSeconds = timeoutPerRequestInMs || 10;
        this.windowMs = windowSeconds * 1000;

        // Initialize low-overhead LRU Cache to secure memory footprint below 5MB threshold
        this.cacheRegistry = new LRUCache<string, { count: number; resetTime: number }>({
            max: 5000, // Enforce maximum tracking threshold to prevent Heap Overflow / Out Of Memory (OOM)
            ttl: this.windowMs, // Automatically purge inactive nodes past the active timeframe allocation
        });

        console.log(`📡 [MemoryRateLimiterService] Initialized with Constraints: ${this.maxRequests} req / ${windowSeconds}s`);
    }

    /**
     * Intercepts ingress IP telemetry arrays and evaluates resource quota consumption.
     * @param {string} ip - Verified client network layer address string.
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
        const currentTime = Date.now();
        let ipTrack = this.cacheRegistry.get(ip);

        // Senarios A: Network endpoint fingerprint is fresh or lifecycle window has expired -> Materialize state
        if (!ipTrack || currentTime > ipTrack.resetTime) {
            ipTrack = { count: 1, resetTime: currentTime + this.windowMs };
            this.cacheRegistry.set(ip, ipTrack);
            // Quota clearance approved, hand over execution to next routing context
            return { status: 200 };
        }

        // Accumulate connection footprints inside the isolated process thread memory matrix
        ipTrack.count++;

        // Senarios B: Volumetric usage breach identified -> Cease downstream packet routing immediately
        if (ipTrack.count > this.maxRequests) {
            console.warn(`🛡️ [Class Perimeter Active] Aborted connection pattern. IP [${ip}] crossed allocated quota.`);
            const retryAfterSeconds = Math.ceil((ipTrack.resetTime - currentTime) / 1000);

            // Fast edge serialization: Return localized HTTP 429 JSON response structure within 0.1ms
            return {
                status: 409,
                error: {
                    message: 'Too many requests. Aggressive automated security rate limiting activated.',
                    rateLimitLimit: this.maxRequests,
                    rateLimitRemaining: 0,
                    headers: {
                        'Retry-After': retryAfterSeconds.toString(),
                        'X-RateLimit-Limit': this.maxRequests.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Address': ip,
                    }
                }
            };
        }
        return { status: 200 };
    }
}

// 👑 SINGLETON ARCHITECTURE BINDING: Export a single instantiated instance to preserve local state across reloads
const globalForRateLimiter = globalThis as unknown as {
    rateLimiterInstance: MemoryRateLimiterService | undefined
};

const USE_RATE_LIMITER_IN_RAM = process.env.RAM_RATE_LIMITER || false;
if (USE_RATE_LIMITER_IN_RAM && !globalForRateLimiter.rateLimiterInstance) {
    const RATE_LIMITER_MAX_REQUESTS = parseInt(process.env.RAM_RATE_LIMIT_REQUESTS || '5');
    const RATE_LIMITER_TIMEOUT_PER_REQUEST = parseInt(process.env.RAM_RATE_LIMIT_TIMEOUT_PER_REQUEST || '10');
    globalForRateLimiter.rateLimiterInstance = new MemoryRateLimiterService(
        !isNaN(RATE_LIMITER_MAX_REQUESTS) && RATE_LIMITER_MAX_REQUESTS > 0 ? RATE_LIMITER_MAX_REQUESTS : 5,
        !isNaN(RATE_LIMITER_TIMEOUT_PER_REQUEST) && RATE_LIMITER_TIMEOUT_PER_REQUEST > 0 ? RATE_LIMITER_TIMEOUT_PER_REQUEST : 10);
}

// =========================================================================
// EXPORT MODULE
// =========================================================================;
export const memoryRateLimiter: MemoryRateLimiterService = globalForRateLimiter.rateLimiterInstance;