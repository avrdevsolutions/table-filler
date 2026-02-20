import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** GET /api/businesses — list businesses for the logged-in user.
 *  On first call: auto-migrate legacy data into a default business. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  let businesses = await prisma.business.findMany({
    where: { ownerUserId: userId },
    orderBy: { createdAt: 'asc' },
  });

  // Auto-migration: if no businesses exist, create a default one and assign orphan data
  if (businesses.length === 0) {
    const defaultBusiness = await prisma.business.create({
      data: { name: 'Firma 1', ownerUserId: userId },
    });
    // Assign orphaned employees and month plans to the default business
    await prisma.employee.updateMany({
      where: { userId, businessId: null },
      data: { businessId: defaultBusiness.id },
    });
    await prisma.monthPlan.updateMany({
      where: { userId, businessId: null },
      data: { businessId: defaultBusiness.id },
    });
    businesses = [defaultBusiness];
  }

  return NextResponse.json(businesses);
}

/** POST /api/businesses — create a new business */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { name, locationName } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Numele firmei este obligatoriu' }, { status: 400 });
  const business = await prisma.business.create({
    data: {
      name: name.trim(),
      locationName: locationName?.trim() || 'Ansamblul Petrila',
      ownerUserId: userId,
    },
  });
  return NextResponse.json(business);
}
