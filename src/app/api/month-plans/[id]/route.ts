import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const plan = await prisma.monthPlan.findFirst({
      where: { id, userId },
      include: { cells: true },
    });
    if (!plan) return NextResponse.json({ error: 'Nu există' }, { status: 404 });
    return NextResponse.json(plan);
  } catch (e) {
    console.error('[GET /api/month-plans/[id]]', e);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const plan = await prisma.monthPlan.findFirst({ where: { id, userId } });
    if (!plan) return NextResponse.json({ error: 'Nu există' }, { status: 404 });
    const body = await req.json();
    const updated = await prisma.monthPlan.update({
      where: { id },
      data: {
        employeeIds: body.employeeIds !== undefined ? JSON.stringify(body.employeeIds) : plan.employeeIds,
        locationName: body.locationName !== undefined ? body.locationName : plan.locationName,
      },
      include: { cells: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[PUT /api/month-plans/[id]]', e);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const plan = await prisma.monthPlan.findFirst({ where: { id, userId } });
    if (!plan) return NextResponse.json({ error: 'Nu există' }, { status: 404 });
    await prisma.monthPlan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/month-plans/[id]]', e);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
