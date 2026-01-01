import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';
import * as pg from 'pg';
import * as bcrypt from 'bcrypt';

// async function main() {
//     // 1. Setup the Adapter (Required for Prisma 7 + Postgres Adapter)
//     const connectionString = process.env.DATABASE_URL!;
//     const pool = new pg.Pool({ connectionString });
//     const adapter = new PrismaPg(pool);

//     // 2. Pass the adapter to the constructor
//     const prisma = new PrismaClient({ adapter });

//     console.log('⏳ START seeding....');

//     try {
//         const hashed = await bcrypt.hash('12345678', 10);
//         const alice = await prisma.user.upsert({
//             where: { email: 'alice@gmail.com' },
//             update: {},
//             create: {
//                 username: 'Alice',
//                 email: 'alice@gmail.com',
//                 password: hashed,
//             },
//         });
//         const bob = await prisma.user.upsert({
//             where: { email: 'bob@gmail.com' },
//             update: {},
//             create: {
//                 username: 'Bob',
//                 email: 'bob@gmail.com',
//                 password: hashed,
//             },
//         });

//         console.log('✅ Seed successful:', { alice, bob });
//     } catch (error) {
//         console.error('❌ Seed failed:', error);
//         throw error;
//     } finally {
//         await prisma.$disconnect();
//         await pool.end();
//     }
// }

// main().catch((e) => {
//     console.error(e);
//     process.exit(1);
// });

// type MessageType = {
//     chatId: string;
//     senderId: string;
//     content: string;
//     createdAt: Date;
//     updatedAt: Date;
// };

// const messages: MessageType[] = [];
// const startDate = new Date();

// for (let i = 0; i < 40; i++) {
//     const isAlice = i % 2 === 0;
//     const senderId = isAlice
//         ? 'cmi0ed3680000w2nstz8980zv'
//         : 'cmi1mpkfx0000w280ufmx7b78';

//     const msgCreatedAt = new Date(startDate.getTime() + i * 60000);

//     messages.push({
//         chatId: 'cmi6837wl0000w2o0xhlfj3ga',
//         senderId: senderId,
//         content: `Message #${i + 1} from ${isAlice ? 'Alice' : 'Bob'}`,
//         createdAt: msgCreatedAt,
//         updatedAt: msgCreatedAt,
//     });
// }

// await prisma.message.createMany({
//     data: messages,
// });

// console.log('✅ SUCCESSFULLY seeded 40 messages with 1 minute interval');

async function generateDmKeysForAllDM() {
    const connectionString = process.env.DATABASE_URL!;
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    // 2. Pass the adapter to the constructor
    const prisma = new PrismaClient({ adapter });

    console.log('⏳ START seeding dmKeys....');

    const chats = await prisma.chat.findMany({
        where: {
            isGroup: false,
            dmKey: null,
        },
        include: {
            participants: {
                select: { userId: true },
            },
        },
    });

    console.log(`Found ${chats.length} chats to update.`);

    let updatedCount = 0;
    let errorCount = 0;

    try {
        for (const chat of chats) {
            // Validation: DMs must have exactly 2 members
            if (chat.participants.length !== 2) {
                console.warn(
                    `⚠️ Chat ${chat.id} has ${chat.participants.length} participants. Skipping.`,
                );
                errorCount++;
                continue;
            }

            // Logic: Sort IDs alphabetically to ensure consistency
            const [userAId, userBId] = chat.participants
                .map((p) => p.userId)
                .sort();

            const dmKey = `${userAId}_${userBId}`;

            await prisma.chat.update({
                where: { id: chat.id },
                data: { dmKey },
            });

            updatedCount++;
            // Log progress every 1 item
            if (updatedCount % 1 === 0) process.stdout.write('.');
        }
    } catch (error) {
        console.error('❌ Seed dmKeys failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

generateDmKeysForAllDM().catch((error) => {
    console.error(error);
    process.exit(1);
});
