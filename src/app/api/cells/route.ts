import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const body = await req.json();

  // batch or single
  const cellsData = body.cells
    ? body.cells
    : [{ monthPlanId: body.monthPlanId, employeeId: body.employeeId, day: body.day, value: body.value }];

  const results = await Promise.all(
    cellsData.map((c: { monthPlanId: string; employeeId: string; day: number; value: string }) =>
      prisma.cell.upsert({
        where: {
          monthPlanId_employeeId_day: {
            monthPlanId: c.monthPlanId,
            employeeId: c.employeeId,
            day: c.day,
          },
        },
        update: { value: c.value },
        create: {
          monthPlanId: c.monthPlanId,
          employeeId: c.employeeId,
          day: c.day,
          value: c.value,
        },
      })
    )
  );
  return NextResponse.json(results);
}
