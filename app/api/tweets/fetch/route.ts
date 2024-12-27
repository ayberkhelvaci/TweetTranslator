import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/options';
import { fetchTweetsManually } from '../../../../lib/services/configService';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await fetchTweetsManually(session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tweets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tweets' },
      { status: 500 }
    );
  }
} 