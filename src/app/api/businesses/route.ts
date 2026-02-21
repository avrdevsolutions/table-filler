import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** GET /api/businesses — list businesses for the logged-in user. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const businesses = await prisma.business.findMany({
    where: { ownerUserId: userId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(businesses);
}

/** POST /api/businesses — create a new business */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { name, locationName } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Numele firmei este obligatoriu' }, { status: 400 });
  if (!locationName?.trim()) return NextResponse.json({ error: 'Locația este obligatorie' }, { status: 400 });
  const business = await prisma.business.create({
    data: {
      name: name.trim(),
      locationName: locationName.trim(),
      ownerUserId: userId,
    },
  });
  return NextResponse.json(business);
}
