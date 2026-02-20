import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get('businessId');
  const includeInactive = searchParams.get('includeInactive') === 'true';
  const activeFilter = includeInactive ? {} : { active: true };
  const where = businessId
    ? { userId, businessId, ...activeFilter }
    : { userId, ...activeFilter };
  const employees = await prisma.employee.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { fullName, businessId } = await req.json();
  if (!fullName) return NextResponse.json({ error: 'Nume obligatoriu' }, { status: 400 });
  if (businessId) {
    const biz = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: userId } });
    if (!biz) return NextResponse.json({ error: 'Firma nu există' }, { status: 404 });
  }
  const emp = await prisma.employee.create({ data: { fullName, userId, businessId: businessId ?? null } });
  return NextResponse.json(emp);
}
