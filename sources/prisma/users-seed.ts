import { PrismaClient } from '@prisma/client';

export async function seedUsers(prisma: PrismaClient) {
    console.log('👤 [Module Users] Initial test users...');

    const testUsername = 'hainguyenjc@gmail.com';
    const testPassword = 'password123'; // TODO hash/encode in PROD

    const user = await prisma.user.upsert({
        where: { username: testUsername },
        update: {},
        create: {
            username: testUsername,
            password: testPassword,
        },
    });

    console.log(`   👉 Account: \x1b[32m${testUsername}\x1b[0m | Password: \x1b[32m${testPassword}\x1b[0m`);
    return user;
}
