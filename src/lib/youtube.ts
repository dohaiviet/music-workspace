export function extractVideoId(url: string): string | null {
    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

export function getThumbnailUrl(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export async function getVideoMetadata(videoId: string): Promise<{ title: string; thumbnail: string } | null> {
    try {
        // For now, we'll use the YouTube oEmbed API which doesn't require an API key
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        return {
            title: data.title || 'Unknown Title',
            thumbnail: getThumbnailUrl(videoId),
        };
    } catch (error) {
        console.error('Error fetching video metadata:', error);
        return null;
    }
}

export async function searchVideos(query: string): Promise<Array<{ videoId: string; title: string; thumbnail: string; channelTitle: string }>> {
    try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            console.error('YOUTUBE_API_KEY is not set');
            throw new Error('YOUTUBE_API_KEY_MISSING');
        }

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('YouTube API Error:', error);
            throw new Error('Failed to search videos');
        }

        const data = await response.json();

        return data.items.map((item: any) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.channelTitle,
        }));
    } catch (error) {
        console.error('Error searching videos:', error);
        return [];
    }
}
