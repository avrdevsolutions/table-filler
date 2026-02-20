import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const employees = await prisma.employee.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { fullName } = await req.json();
  if (!fullName) return NextResponse.json({ error: 'Nume obligatoriu' }, { status: 400 });
  const emp = await prisma.employee.create({ data: { fullName, userId } });
  return NextResponse.json(emp);
}
