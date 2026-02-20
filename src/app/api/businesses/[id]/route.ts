import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const biz = await prisma.business.findFirst({ where: { id, ownerUserId: userId } });
  if (!biz) return NextResponse.json({ error: 'Nu există' }, { status: 404 });
  const { name, locationName } = await req.json();
  const updated = await prisma.business.update({
    where: { id },
    data: {
      name: name?.trim() ?? biz.name,
      locationName: locationName?.trim() ?? biz.locationName,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const biz = await prisma.business.findFirst({ where: { id, ownerUserId: userId } });
  if (!biz) return NextResponse.json({ error: 'Nu există' }, { status: 404 });
  await prisma.business.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
