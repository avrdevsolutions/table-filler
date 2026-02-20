import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const plan = await prisma.monthPlan.findFirst({
    where: { id: params.id, userId },
    include: { cells: true },
  });
  if (!plan) return NextResponse.json({ error: 'Nu există' }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const plan = await prisma.monthPlan.findFirst({ where: { id: params.id, userId } });
  if (!plan) return NextResponse.json({ error: 'Nu există' }, { status: 404 });
  const body = await req.json();
  const updated = await prisma.monthPlan.update({
    where: { id: params.id },
    data: {
      employeeIds: body.employeeIds !== undefined ? JSON.stringify(body.employeeIds) : plan.employeeIds,
      locationName: body.locationName !== undefined ? body.locationName : plan.locationName,
    },
    include: { cells: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const plan = await prisma.monthPlan.findFirst({ where: { id: params.id, userId } });
  if (!plan) return NextResponse.json({ error: 'Nu există' }, { status: 404 });
  await prisma.monthPlan.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
