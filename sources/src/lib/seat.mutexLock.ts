import { LocalMutexManager, localMutexLock } from "./mutexLock";

// Define global registry to maintain singleton state across Next.js Hot-Reloads
const globalForSeatMutex = global as unknown as {
    localSeatMutexInstance: LocalSeatMutexManager | undefined;
};

export class LocalSeatMutexManager {
    private mutex: LocalMutexManager;

    // Dependency Injection pattern via constructor binding
    constructor(mutexManager: LocalMutexManager) {
        this.mutex = mutexManager;
    }

    private generateSeatKeyPrefix(uniqueId: string): string {
        // TODO could use more key such as cinema identity, resturant identity. Ex: cinema:<cinema-1>:seat:<seat-1>
        if ((uniqueId || '').length <= 0) {
            uniqueId = 'default';
        }
        return `${uniqueId}:seat:`;
    }

    private generateSeatKey(uniqueId: string, seatId: string): string {
        const prefix: string = this.generateSeatKeyPrefix(uniqueId);
        return `${prefix}:${seatId}`;
    }

    /**
     * 🟢 HOLD ACTION: Hold a seat temporarily using core lock mechanics
     */
    public lock(uniqueId: string, seatId: string, seatStatus: string, ttl: number = 10000): boolean {
        const targetKey = this.generateSeatKey(uniqueId, seatId);
        return this.mutex.lock(targetKey, seatStatus, ttl);
    }

    /**
     * 🔴 RELEASE ACTION: Release a held seat via core unlock mechanics
     */
    public unlock(uniqueId: string, seatId: string, seatStatus: string): boolean {
        const targetKey = this.generateSeatKey(uniqueId, seatId);
        const rawMap = this.mutex.data();

        // Safety guard: Only allowed to unlock if the seat state is explicitly 'HELD'
        if (rawMap.get(targetKey) === seatStatus) {
            return this.mutex.unlock(targetKey);
        }
        return false;
    }

    /**
     * 🔴 RELEASE ACTION: Release a held seat via core unlock mechanics
     */
    public forceUnlock(uniqueId: string, seatId: string): boolean {
        const targetKey = this.generateSeatKey(uniqueId, seatId);
        const rawMap = this.mutex.data();
        return this.mutex.unlock(targetKey);
    }

    /**
     * 🏆 RESERVE ACTION: Upgrade a temporary 'HELD' state to a permanent 'RESERVED' state
     */
    public updateLock(uniqueId: string, seatId: string, oldSeatStatus: string, newSeatStatus: string): boolean {
        const targetKey = this.generateSeatKey(uniqueId, seatId);
        const rawMap = this.mutex.data();

        if (rawMap.get(targetKey) === oldSeatStatus) {
            return this.mutex.updateLock(targetKey, newSeatStatus);
        }
        return false;
    }

    /**
     * 🧹 RELEASE ACTION: Clear all current temporary holds from the cluster node memory
     */
    public unlockAll(unlockStatus: string): void {
        [...this.mutex.data()].filter(([key, value]) => {
            return value === unlockStatus;
        }).forEach((v, k) => this.mutex.unlock(k));
    }

    /**
     * 🔍 SEATS ACTION: Scan and return the formatted seat matrix dictionary
     */
    public data(uniqueId: string): Record<any, any> {
        const prefix = this.generateSeatKeyPrefix(uniqueId);
        const results: Record<any, any> = {};
        [...this.mutex.data()].filter(([key, value]) => {
            return (key || '').toString().startsWith(prefix);
        }).forEach((v, k) => results[k.toString().replace(prefix, '')] = v);
        return results;
    }

    /**
     * 🔍 SEATS ACTION: Check whether seat has been locked in mutex with specified status
     */
    public isLocked(uniqueId: string, seatId: string, seatStatus: string): boolean {
        const seatMutexKey = this.generateSeatKey(uniqueId, seatId);
        return [...this.mutex.data()].filter(([key, value]) => {
            return key === seatMutexKey && value === seatStatus;
        }).length > 0;
    }
}

// Enforce Singleton layout compliance
if (!globalForSeatMutex.localSeatMutexInstance) {
    globalForSeatMutex.localSeatMutexInstance = new LocalSeatMutexManager(localMutexLock);
}

// export module
export const seatMutexLock = globalForSeatMutex.localSeatMutexInstance;
