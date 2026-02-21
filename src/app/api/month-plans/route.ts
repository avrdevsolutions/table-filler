import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** Returns employees relevant for a given (businessId, month, year). */
async function getRelevantEmployeeIds(
  businessId: string,
  month: number,
  year: number
): Promise<string[]> {
  const activeEmployees = await prisma.employee.findMany({
    where: { businessId, active: true },
    orderBy: { createdAt: 'asc' },
  });
  return activeEmployees
    .filter(e => {
      const effectiveStart = e.startDate ? new Date(e.startDate) : new Date(e.createdAt);
      if (isNaN(effectiveStart.getTime())) return true;
      const startYear = effectiveStart.getFullYear();
      const startMonth = effectiveStart.getMonth() + 1;
      if (startYear > year || (startYear === year && startMonth > month)) return false;
      if (!e.terminationDate) return true;
      const term = new Date(e.terminationDate);
      if (isNaN(term.getTime())) return true;
      const termYear = term.getFullYear();
      const termMonth = term.getMonth() + 1;
      return termYear > year || (termYear === year && termMonth >= month);
    })
    .map(e => e.id);
}

export async function GET(req: Request) {
  try {
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
  } catch (e) {
    console.error('[GET /api/month-plans]', e);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const { month, year, businessId } = await req.json();
    if (!month || !year) return NextResponse.json({ error: 'Luna și anul sunt obligatorii' }, { status: 400 });

    if (businessId) {
      const biz = await prisma.business.findFirst({ where: { id: businessId, ownerUserId: userId } });
      if (!biz) return NextResponse.json({ error: 'Firma nu există' }, { status: 404 });

      const existing = await prisma.monthPlan.findFirst({ where: { businessId, month, year } });
      if (existing) {
        // Refresh employeeIds: add any employees that joined after plan creation
        const relevantIds = await getRelevantEmployeeIds(businessId, month, year);
        const existingIds: string[] = JSON.parse(existing.employeeIds || '[]');
        const newIds = relevantIds.filter(id => !existingIds.includes(id));
        if (newIds.length > 0) {
          const updated = await prisma.monthPlan.update({
            where: { id: existing.id },
            data: { employeeIds: JSON.stringify([...existingIds, ...newIds]) },
          });
          return NextResponse.json(updated);
        }
        return NextResponse.json(existing);
      }

      // Create new plan with all relevant employees
      const relevantIds = await getRelevantEmployeeIds(businessId, month, year);
      const plan = await prisma.monthPlan.create({
        data: {
          month,
          year,
          userId,
          businessId,
          employeeIds: JSON.stringify(relevantIds),
          locationName: biz.locationName,
        },
      });
      return NextResponse.json(plan);
    }

    const existing = await prisma.monthPlan.findFirst({ where: { userId, businessId: null, month, year } });
    if (existing) return NextResponse.json(existing);
    const plan = await prisma.monthPlan.create({
      data: { month, year, userId, employeeIds: '[]' },
    });
    return NextResponse.json(plan);
  } catch (e) {
    console.error('[POST /api/month-plans]', e);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
