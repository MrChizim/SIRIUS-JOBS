import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export async function withTransaction<T>(fn: (tx: PrismaClient) => Promise<T>) {
  return prisma.$transaction(async tx => fn(tx));
}
