import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const emp = await prisma.employee.findFirst({ where: { id, userId } });
    if (!emp) return NextResponse.json({ error: 'Nu există' }, { status: 404 });
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        fullName: body.fullName ?? emp.fullName,
        active: body.active ?? emp.active,
        startDate: body.startDate !== undefined ? body.startDate : emp.startDate,
        terminationDate: body.terminationDate !== undefined ? body.terminationDate : emp.terminationDate,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[PUT /api/employees/[id]]', e);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const emp = await prisma.employee.findFirst({ where: { id, userId } });
    if (!emp) return NextResponse.json({ error: 'Nu există' }, { status: 404 });
    await prisma.employee.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/employees/[id]]', e);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
