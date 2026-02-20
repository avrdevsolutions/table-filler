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
  const where = businessId ? { userId, businessId } : { userId };
  const plans = await prisma.monthPlan.findMany({
    where,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { month, year, businessId } = await req.json();
  if (!month || !year) return NextResponse.json({ error: 'Luna și anul sunt obligatorii' }, { status: 400 });

  if (businessId) {
    const biz = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: userId } });
    if (!biz) return NextResponse.json({ error: 'Firma nu există' }, { status: 404 });
    // Check uniqueness by business
    const existing = await prisma.monthPlan.findFirst({ where: { businessId, month, year } });
    if (existing) return NextResponse.json(existing);
    // Auto-include employees active during this plan month
    const activeEmployees = await prisma.employee.findMany({
      where: { businessId, active: true },
      orderBy: { createdAt: 'asc' },
    });
    const relevantEmployees = activeEmployees.filter(e => {
      const effectiveStart = e.startDate ? new Date(e.startDate) : new Date(e.createdAt);
      if (isNaN(effectiveStart.getTime())) return true; // fallback: include if date is invalid
      const startYear = effectiveStart.getFullYear();
      const startMonth = effectiveStart.getMonth() + 1;
      if (startYear > year || (startYear === year && startMonth > month)) return false;
      if (!e.terminationDate) return true;
      const term = new Date(e.terminationDate);
      if (isNaN(term.getTime())) return true;
      const termYear = term.getFullYear();
      const termMonth = term.getMonth() + 1;
      return termYear > year || (termYear === year && termMonth >= month);
    });
    const employeeIds = JSON.stringify(relevantEmployees.map(e => e.id));
    const plan = await prisma.monthPlan.create({
      data: { month, year, userId, businessId, employeeIds, locationName: biz.locationName },
    });
    return NextResponse.json(plan);
  }

  const existing = await prisma.monthPlan.findFirst({ where: { userId, businessId: null, month, year } });
  if (existing) return NextResponse.json(existing);
  const plan = await prisma.monthPlan.create({
    data: { month, year, userId, employeeIds: '[]' },
  });
  return NextResponse.json(plan);
}
