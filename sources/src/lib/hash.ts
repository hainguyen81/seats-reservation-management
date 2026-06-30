import { hash, compare } from 'bcrypt-ts';

// 💡 salt to hash
const SALT_ROUNDS = 10;

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
    return await hash(password, SALT_ROUNDS);
}

/**
 * Compare hashed password
 * @returns true/false
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return await compare(password, hash);
}
