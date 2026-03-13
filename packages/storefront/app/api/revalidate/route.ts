import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

const REVALIDATE_SECRET = process.env['REVALIDATE_SECRET'] ?? 'forkcart-revalidate';

/**
 * POST /api/revalidate — purge Next.js cache and optionally warm pages.
 * Body: { secret, paths?: string[], all?: boolean }
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    secret?: string;
    paths?: string[];
    all?: boolean;
  };

  if (body.secret !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const revalidated: string[] = [];

  if (body.all) {
    // Revalidate everything
    revalidatePath('/', 'layout');
    revalidated.push('/');
  } else if (body.paths?.length) {
    for (const path of body.paths) {
      revalidatePath(path);
      revalidated.push(path);
    }
  } else {
    // Default: revalidate main pages
    const defaultPaths = ['/', '/category/all', '/cart', '/checkout'];
    for (const path of defaultPaths) {
      revalidatePath(path);
      revalidated.push(path);
    }
    // Also revalidate the layout (catches header, footer, etc.)
    revalidatePath('/', 'layout');
  }

  return NextResponse.json({
    revalidated,
    timestamp: new Date().toISOString(),
  });
}
