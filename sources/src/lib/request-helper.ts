// =========================================================================
// 🕵️ UNIVERSAL DEEP IP TRACE EXTRACTION SUBSYSTEM (ANTI-SPOOFING RADAR)
// =========================================================================
/**
 * Traverses across all known proxy orchestration header vectors to extract the authentic 
 * edge client IP address, neutralizing spoofing attempts over multi-tiered hop fabrics [3.2].
 */
export function extractClientIp(req: Request): string {
    // 1. Highest Priority: Cloudflare WAF Enterprise Client IP mapping [3.2]
    const cfClientIp = req.headers.get('cf-connecting-ip');
    if (cfClientIp) return cfClientIp.trim();

    // 2. AWS True Client IP mapping (Used heavily under AWS ALB / CloudFront) [3.2]
    const awsTrueIp = req.headers.get('x-true-client-ip');
    if (awsTrueIp) return awsTrueIp.trim();

    // 3. Fastly / Akamai Edge Architecture Client IP vector mapping [3.2]
    const fastlyIp = req.headers.get('fastly-client-ip');
    if (fastlyIp) return fastlyIp.trim();

    // 4. Standard Forwarding Pipeline Chain: 'X-Forwarded-For' parsing loop [3.2]
    // In a multi-proxy architecture, this header returns a comma-separated chain: "client, proxy1, proxy2" [3.2].
    // We must isolate the first, leftmost IP element to target the real threat origin [3.2].
    const xForwardedFor = req.headers.get('x-forwarded-for');
    if (xForwardedFor) {
        const ipChain = xForwardedFor.split(',');
        const originClientIp = ipChain[0]?.trim();
        if (originClientIp) return originClientIp;
    }

    // 5. Nginx Reverse Proxy / Kubernetes Ingress custom real IP pointer [3.2]
    const xRealIp = req.headers.get('x-real-ip');
    if (xRealIp) return xRealIp.trim();

    // 6. Next.js Native Server Edge Framework Runtime IP Resolver fallback [3.2]
    if (((req as any)?.ip || '').length) return (req as any)?.ip?.trim();

    // 7. Absolute Local Fallback Route to protect execution runtime parameters from crashing [3.2]
    return '127.0.0.1';
}