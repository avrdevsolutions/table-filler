import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ScheduleTable from '@/components/ScheduleTable';
import type { Employee, MonthPlan, Cell } from '@/types';
import ExportButton from './ExportButton';
import ScaleWrapper from './ScaleWrapper';

export default async function ExportPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const userId = (session.user as { id: string }).id;

  const plan = await prisma.monthPlan.findUnique({
    where: { id: planId },
    include: { cells: true, business: true },
  });
  if (!plan) notFound();

  // Authorization: plan must belong to the logged-in user
  if (plan.userId !== userId && plan.business?.ownerUserId !== userId) notFound();

  const employeeIds: string[] = JSON.parse(plan.employeeIds || '[]');
  const employeesRaw = await prisma.employee.findMany({ where: { id: { in: employeeIds } } });

  const employees: Employee[] = employeesRaw.map(e => ({
    id: e.id,
    fullName: e.fullName,
    active: e.active,
    terminationDate: e.terminationDate ?? null,
    userId: e.userId,
    businessId: e.businessId ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  const planData: MonthPlan = {
    id: plan.id,
    month: plan.month,
    year: plan.year,
    locationName: plan.locationName,
    userId: plan.userId,
    businessId: plan.businessId ?? null,
    employeeIds: plan.employeeIds,
    cells: plan.cells.map((c): Cell => ({
      id: c.id,
      monthPlanId: c.monthPlanId,
      employeeId: c.employeeId,
      day: c.day,
      value: c.value,
    })),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };

  return (
    <div>
      <div className="print:hidden p-4 bg-gray-100 flex gap-3 items-center">
        <span className="text-sm text-gray-600">
          Previzualizare export (1920×1080) — apăsați butonul pentru a descărca PNG
        </span>
        <ExportButton />
      </div>
      {/* ScaleWrapper resizes the preview to fit the viewport; html2canvas captures at full 1920×1080 */}
      <ScaleWrapper>
        <ScheduleTable plan={planData} employees={employees} businessName={plan.business?.name} />
      </ScaleWrapper>
    </div>
  );
}
