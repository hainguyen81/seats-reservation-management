/**
 * Dynamically compiles a fully-qualified absolute URL by fusing the Base API Gateway URL 
 * with the target business resource endpoint suffix cleanly [3.2].
 * Automatically sanitizes trailing/leading slash duplicates and redundant whitespace characters [3.2].
 * 
 * @param endpoint - The target resource path suffix (e.g., '/api/seats/book' or 'api/auth/login') [3.2]
 * @returns A pristine, standardized absolute destination URL string [3.2]
 */
export function buildApiPath(endpoint: string): string {
    // 1. Extract the raw environment base URL vector or fall back to localhost gateway boundaries [3.2]
    const rawBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.TARGET_URL || 'http://localhost:3000';

    // 2. Sanitize edge whitespace artifacts from both string vectors [3.2]
    const cleanBase = rawBaseUrl.trim();
    const cleanEndpoint = endpoint.trim();

    try {
        // KỊCH BẢN A: If the base url configuration matches a stateful valid absolute web URL schema [3.2]
        // The native URL constructor automatically normalizes path join slashes flawlessly under the hood [3.2]
        if (cleanBase.startsWith('http://') || cleanBase.startsWith('https://')) {

            // Remove trailing slash from base to prevent duplicate layout processing [3.2]
            const sanitizedBase = cleanBase.replace(/\/$/, '');
            // Ensure the endpoint suffix initiates with exactly one leading slash char boundary [3.2]
            const sanitizedEndpoint = cleanEndpoint.startsWith('/') ? cleanEndpoint : `/${cleanEndpoint}`;

            const compiledUrl = new URL(sanitizedEndpoint, sanitizedBase);
            return compiledUrl.toString();
        }
    } catch (urlCompilerError) {
        console.warn('⚠️ Native URL constructor mismatch. Falling back to structured RegExp string concatenation execution.');
    }

    // KỊCH BẢN B: Fallback pipeline using rigid regular expression slicing mechanisms [3.2]
    // Strip out last trailing slash from base, strip out first leading slash from endpoint, then fuse them [3.2]
    const baseWithoutTrailingSlash = cleanBase.replace(/\/$/, '');
    const endpointWithoutLeadingSlash = cleanEndpoint.replace(/^\//, '');

    return `${baseWithoutTrailingSlash}/${endpointWithoutLeadingSlash}`;
}

/**
 * Stateful unified wrapper function to process native fetch operations [3.2]
 */
async function requestGateway(endpoint: string, options: RequestInit = {}) {
    const absoluteUrl = buildApiPath(endpoint);

    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(absoluteUrl, {
        ...options,
        headers: defaultHeaders,
    });

    if (!response.ok) {
        throw new Error(`🚨 [ ${endpoint} ] HTTP Transport Fault: Status ${response.status}`);
    }

    return response.json(); // Automatically unwrap JSON payload buffer streams [3.2]
}

// =========================================================================
// 🎛️ UNIVERSAL FETCH WRAPPER OBJECT MATRIX EXPORT [3.2]
// =========================================================================
export const nativeClient = {
    get: (url: string, options?: RequestInit) => requestGateway(url, { ...options, method: 'GET' }),
    post: (url: string, body?: any, options?: RequestInit) => requestGateway(url, { ...options, method: 'POST', body: JSON.stringify(body || {}) }),
    postIncludeCredentials: (url: string, body?: any, options?: RequestInit) => requestGateway(url, { ...options, method: 'POST', body: JSON.stringify(body || {}), credentials: "include" }),
    put: (url: string, body?: any, options?: RequestInit) => requestGateway(url, { ...options, method: 'PUT', body: JSON.stringify(body || {}) }),
    delete: (url: string, options?: RequestInit) => requestGateway(url, { ...options, method: 'DELETE' }),
};
