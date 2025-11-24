import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { searchVideos } from '@/lib/youtube';

export async function GET(request: NextRequest) {
    try {
        // Check authentication (allow any logged in user)
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json(
                { error: 'Query parameter "q" is required' },
                { status: 400 }
            );
        }

        const videos = await searchVideos(query);

        return NextResponse.json({ videos });
    } catch (error: any) {
        console.error('Error in search route:', error);

        if (error.message === 'YOUTUBE_API_KEY_MISSING') {
            return NextResponse.json(
                { error: 'YouTube API configuration is missing. Please contact admin.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to search videos' },
            { status: 500 }
        );
    }
}
