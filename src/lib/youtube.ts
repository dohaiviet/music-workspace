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
