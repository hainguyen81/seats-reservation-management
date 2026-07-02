// sources/src/lib/mobileDbService.ts
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const nodeEnv = process.env.NODE_ENV;
const mobileMode = ["mobile", "android", "ios"].includes(nodeEnv);
const dbProvider = process.env.DATABASE_PROVIDER;
const sqliteMode = ["sqlite"].includes(dbProvider);

// Define global registry to maintain singleton state across Next.js Hot-Reloads
const globalForThis = global as unknown as {
    mobileDbService: MobileDbService | undefined;
};

// mobile db service
export class MobileDbService {
    private sqliteConnection: any = null;
    private dbFile: any = null;
    private dbInstance: any = null;

    // Dependency Injection pattern via constructor binding
    constructor(sqliteDb?: string | undefined) {
        this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);
        this.dbFile = (sqliteDb || 'seats-reservation');
    }

    private auditLogTable() {
        return `
            CREATE TABLE IF NOT EXISTS "AuditLog"(
                "id" TEXT NOT NULL,
                "userId" TEXT,
                "action" TEXT NOT NULL,
                "target" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "details" TEXT,
                "ipAddress" TEXT,
                "ipAddresses" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY("id")
            );
        `
    }

    private bookingTable() {
        return `
            CREATE TABLE IF NOT EXISTS "Booking"(
                "id" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "seatId" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "expiresAt" DATETIME NOT NULL,
                PRIMARY KEY("id"),
                CONSTRAINT "Booking_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "Booking_seatId_fkey" FOREIGN KEY("seatId") REFERENCES "Seat"("id") ON DELETE RESTRICT ON UPDATE CASCADE
            );
        `
    }

    private seatTable() {
        return `
            CREATE TABLE IF NOT EXISTS "Seat"(
                "id" TEXT NOT NULL,
                "number" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "version" INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY("id")
            );
        `
    }

    private userTable() {
        return `
            CREATE TABLE IF NOT EXISTS "User"(
                "id" TEXT NOT NULL,
                "username" TEXT NOT NULL,
                "password" TEXT NOT NULL,
                "refreshToken" TEXT,
                PRIMARY KEY("id")
            );
        `;
    }

    private indexKeys() {
        return `
            CREATE UNIQUE INDEX IF NOT EXISTS "Seat_number_key" ON "Seat"("number" ASC);
            CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username" ASC);
        `;
    }

    private initializeDbScripts() {
        return [
            this.auditLogTable(),
            this.bookingTable(),
            this.seatTable(),
            this.userTable(),
            this.indexKeys(),
        ];
    }

    /**
     * Initializes the native SQLite database file inside the Android/iOS secure sandbox storage.
     */
    public async initializeDatabase(): Promise<void> {
        try {
            const initializeScripts: string[] = this.initializeDbScripts();

            // 1. Create or open the encrypted physical database file on the phone storage
            const db = await this.sqliteConnection.createConnection(
                this.dbFile,            // Database file name saved inside mobile local disk
                false,                  // encrypted = false
                'no-encryption',
                1,                      // version = 1
                false                   // readonly = false
            );

            await db.open();
            this.dbInstance = db;

            // 2. 🔥 MATERIALIZE SCHEMAS NATIVELY: Initialize tables directly if fresh boot
            console.log('⏳  [MobileDbService] SQLite Standalone Engine is initializing database...');
            await db.execute(initializeScripts.join());
            console.log('📡 [MobileDbService] SQLite Standalone Engine materialized successfully on device!');
        } catch (err: any) {
            console.error('🚨 [Mobile DB Initialization Fault]:', err.message);
        }
    }

    /**
     * Universal write gateway to insert data into local phone storage [3.2]
     */
    public async executeWrite(sqlClause: string, values: any[]): Promise<void> {
        if (!this.dbInstance) await this.initializeDatabase();
        await this.dbInstance.run(sqlClause, values);
    }

    /**
     * Universal read gateway to query data locally without any internet connection [3.2]
     */
    public async executeRead(sqlClause: string, values: any[] = []): Promise<any[]> {
        if (!this.dbInstance) await this.initializeDatabase();
        const result = await this.dbInstance.query(sqlClause, values);
        return result?.values || [];
    }
}

// Enforce Singleton layout compliance
if (mobileMode && sqliteMode && !globalForThis.mobileDbService) {
    globalForThis.mobileDbService = new MobileDbService();
}

// export module
export const mobileDbService = globalForThis.mobileDbService;
