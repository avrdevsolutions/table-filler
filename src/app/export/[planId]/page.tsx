import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ScheduleTable from '@/components/ScheduleTable';
import type { Employee, MonthPlan, Cell } from '@/types';
import ExportButton from './ExportButton';

export default async function ExportPage({ params }: { params: { planId: string } }) {
  const plan = await prisma.monthPlan.findUnique({
    where: { id: params.planId },
    include: { cells: true },
  });
  if (!plan) notFound();

  const employeeIds: string[] = JSON.parse(plan.employeeIds || '[]');
  const employeesRaw = await prisma.employee.findMany({ where: { id: { in: employeeIds } } });
  
  const employees: Employee[] = employeesRaw.map(e => ({
    id: e.id,
    fullName: e.fullName,
    active: e.active,
    terminationDate: e.terminationDate ?? null,
    userId: e.userId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  const planData: MonthPlan = {
    id: plan.id,
    month: plan.month,
    year: plan.year,
    locationName: plan.locationName,
    userId: plan.userId,
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
        <span className="text-sm text-gray-600">Pagina de export — apăsați butonul pentru a descărca PNG</span>
        <ExportButton />
      </div>
      <div id="export-root" style={{ width: 1920, height: 1080 }}>
        <ScheduleTable plan={planData} employees={employees} />
      </div>
    </div>
  );
}
