import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: { email: 'test@example.com', password: hashed, name: 'Test User' },
  });
  console.log('Seed done: test@example.com / password123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
