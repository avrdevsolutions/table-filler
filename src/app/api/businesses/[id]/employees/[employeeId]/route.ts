import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; employeeId: string }> }
) {
  try {
    const { id: businessId, employeeId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    const userId = (session.user as { id: string }).id;

    // Verify the employee belongs to the current user and the given business
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, userId, businessId },
    });
    if (!emp) return NextResponse.json({ error: 'Nu există' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // 1. Delete all cell values for this employee
      await tx.cell.deleteMany({ where: { employeeId } });

      // 2. Remove employee from employeeIds in all month plans for this business
      const plans = await tx.monthPlan.findMany({
        where: { businessId },
        select: { id: true, employeeIds: true },
      });
      for (const plan of plans) {
        let ids: string[] = [];
        try { ids = JSON.parse(plan.employeeIds); } catch { /* invalid JSON – treat as empty */ ids = []; }
        const updated = ids.filter((eid: string) => eid !== employeeId);
        await tx.monthPlan.update({
          where: { id: plan.id },
          data: { employeeIds: JSON.stringify(updated) },
        });
      }

      // 3. Delete the employee record
      await tx.employee.delete({ where: { id: employeeId } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/businesses/[id]/employees/[employeeId]]', e);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
