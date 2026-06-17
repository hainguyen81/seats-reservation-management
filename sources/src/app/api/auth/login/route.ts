import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    
    // Đơn giản hóa bài toán kiểm thử: Tự động tạo user nếu chưa có
    let user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      user = await prisma.user.create({
        data: { username, password } // need to hash password
      });
    }

    await createSession(user.id);
    return NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
