import { hashSync, compareSync } from 'bcrypt-ts';

// 💡 Tham số tạo độ phức tạp thuật toán (Tiêu chuẩn an toàn bảo mật)
const SALT_ROUNDS = 10;

/**
 * Hàm mã hóa mật khẩu thô sang chuỗi Hash bằng thuật toán tịnh tiến thời gian
 */
export function hashPassword(password: string): string {
    return hashSync(password, SALT_ROUNDS);
}

/**
 * Hàm giải mã và so khớp mật khẩu thô với chuỗi mật khẩu đã mã hóa trong DB
 * @returns true nếu chính xác, false nếu sai mật khẩu
 */
export function comparePassword(password: string, hash: string): boolean {
    return compareSync(password, hash);
}
