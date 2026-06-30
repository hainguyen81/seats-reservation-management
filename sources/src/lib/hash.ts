import { hashSync, compareSync } from 'bcrypt-ts';

// 💡 salt to hash
const SALT_ROUNDS = 10;

/**
 * Hash password
 */
export function hashPassword(password: string): string {
    return hashSync(password, SALT_ROUNDS);
}

/**
 * Compare hashed password
 * @returns true/false
 */
export function comparePassword(password: string, hash: string): boolean {
    return compareSync(password, hash);
}
