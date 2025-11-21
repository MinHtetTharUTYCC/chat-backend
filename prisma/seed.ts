// import { PrismaClient } from "@prisma/client"

// type MessageType = {
//     chatId: string,
//     senderId: string,
//     content: string,
//     createdAt: Date,
//     updatedAt: Date,
// }

// const prisma = new PrismaClient()

// async function main() {
//     console.log("⏳ START seeding....")

//     const messages: MessageType[] = []
//     const startDate = new Date();

//     for (let i = 0; i < 40; i++) {
//         const isAlice = i % 2 === 0;
//         const senderId = isAlice ? "cmi0ed3680000w2nstz8980zv" : "cmi1mpkfx0000w280ufmx7b78";

//         const msgCreatedAt = new Date(startDate.getTime() + i * 60000);

//         messages.push({
//             chatId: "cmi6837wl0000w2o0xhlfj3ga",
//             senderId: senderId,
//             content: `Message #${i + 1} from ${isAlice ? 'Alice' : 'Bob'}`,
//             createdAt: msgCreatedAt,
//             updatedAt: msgCreatedAt,
//         });
//     }

//     await prisma.message.createMany({
//         data: messages,
//     });

//     console.log("✅ SUCCESSFULLY seeded 40 messages with 1 minute interval")
// }

// main().catch((err) => {
//     console.error("❌ Error Seeding:", err)
//     process.exit(1);
// }).finally(async () => {
//     await prisma.$disconnect();
// })