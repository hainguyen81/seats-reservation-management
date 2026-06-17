import { PrismaClient } from '@prisma/client';

export async function seedSeats(prisma: PrismaClient) {
    console.log('🌱 [Module Seats] Start seeding seats...');

    // 1. Check total seats configuration
    const totalSeatsEnv = process.env.TOTAL_SEATS;
    const totalSeats = totalSeatsEnv ? parseInt(totalSeatsEnv, 10) : 0;

    if (isNaN(totalSeats) || totalSeats <= 0) {
        console.error(`❌ Total seats ${totalSeats} is invalid!`);
        process.exit(1);
    }

    console.log(`📊 Initial ${totalSeats} seats.`);

    // 2. loop to create seats
    for (let i = 1; i <= totalSeats; i++) {
        const seatId = `seat-${i}`;
        const seatNumber = `A${i}`;

        await prisma.seat.upsert({
            where: { id: seatId },
            update: {}, // do nothing if seat existed
            create: {
                id: seatId,
                number: seatNumber,
                status: 'AVAILABLE',
            },
        });
    }

    console.log(`✅ ${totalSeats} seats (from A1 to A${totalSeats}) had already created successfully!`);
}
