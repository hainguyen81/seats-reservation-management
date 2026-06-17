import { PrismaClient } from '@prisma/client';
import { seedUsers } from './users-seed';
import { seedSeats } from './seats-seed';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 --- START DATA SEEDING ---');

    // Gọi tuần tự từng module dữ liệu
    await seedUsers(prisma);
    await seedSeats(prisma);

    console.log('🏁 --- END DATA SEEDING ---');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Exception while seeding data:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
