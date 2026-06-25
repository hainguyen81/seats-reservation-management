// Define global registry to maintain singleton state across Next.js Hot-Reloads
const globalForMutex = global as unknown as {
    localMutexInstance: LocalMutexManager | undefined;
};

// =========================================================================
// 🧱 LAYER 1: THE GENERIC LOW-LEVEL IN-MEMORY MUTEX ENGINE (LOCK/UNLOCK ONLY)
// =========================================================================
export class LocalMutexManager {
    private activeLocks: Map<any, any>; // Key: Unique Key | Value: Locked Object
    private timeouts: Map<any, NodeJS.Timeout>;

    constructor() {
        this.activeLocks = new Map<any, any>();
        this.timeouts = new Map<any, NodeJS.Timeout>();
    }

    /**
     * Core execution thread to acquire a clean in-memory lock
     */
    public lock(key: any, value: any, ttl: number = 10000): boolean {
        if (this.activeLocks.has(key)) {
            return false; // Collision detected, lock is currently busy
        }

        this.activeLocks.set(key, value);

        // Dynamic self-eviction timer block
        const timeoutId = setTimeout(() => {
            this.activeLocks.delete(key);
            this.timeouts.delete(key);
        }, ttl);

        this.timeouts.set(key, timeoutId);
        return true;
    }

    /**
     * Core execution thread to release a lock and kill its timer permanently
     */
    public unlock(key: any): boolean {
        if (this.activeLocks.has(key)) {
            const activeTimeout = this.timeouts.get(key);
            if (activeTimeout) {
                clearTimeout(activeTimeout);
                this.timeouts.delete(key);
            }
            this.activeLocks.delete(key);
            return true;
        }
        return false;
    }

    /**
     * Force update the value payload of an existing locked key without changing timers
     */
    public updateLock(key: any, newValue: any): boolean {
        if (this.activeLocks.has(key)) {
            // Cancel the automated TTL eviction timer to make this lock permanent
            const activeTimeout = this.timeouts.get(key);
            if (activeTimeout) {
                clearTimeout(activeTimeout);
                this.timeouts.delete(key);
            }
            this.activeLocks.set(key, newValue);
            return true;
        }
        return false;
    }

    public data(): Map<any, any> {
        return this.activeLocks;
    }
}

// Enforce Singleton layout compliance
if (!globalForMutex.localMutexInstance) {
    globalForMutex.localMutexInstance = new LocalMutexManager();
}

// export module
export const localMutexLock = globalForMutex.localMutexInstance;
