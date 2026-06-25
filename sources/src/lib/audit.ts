import { prisma } from './db';

interface AuditLogPayload {
    userId?: string | null;
    action: 'HOLD' | 'SINGLE_RELEASE' | 'RESERVED' | 'RELEASE' | 'RELEASE_EXPIRED' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED';
    target: string;
    status: 'SUCCESS' | 'FAILED';
    details?: any;
    req?: Request;
}

export async function auditLog({ userId, action, target, status, details, req }: AuditLogPayload) {
    try {
        let ipAddress = 'UNKNOWN';

        if (req) {
            // read K8s Ingress / NGINX Proxy Headers
            ipAddress = req.headers.get('x-forwarded-for') ||
                req.headers.get('x-real-ip') || '127.0.0.1';
        }

        // write to DB
        await prisma.auditLog.create({
            data: {
                userId: userId || null,
                action,
                target,
                status,
                ipAddress: ipAddress.includes(',') ? ipAddress.split(',')[0].trim()  : ipAddress,
                ipAddresses: ipAddress,
                details: details ? JSON.stringify(details) : null,
            },
        });
    } catch (error) {
        console.error('⚠️ [Audit Log Error]: Failed to persist audit trail:', error);
    }
}
