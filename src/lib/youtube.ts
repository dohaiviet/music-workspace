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
    const fs = require('fs');
    const log = (msg: string) => fs.appendFileSync('/tmp/debug_youtube.log', msg + '\n');

    try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        log(`getVideoMetadata called for ${videoId}. API Key exists: ${!!apiKey}`);

        if (apiKey) {
            const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
            log(`Fetching: ${url}`);
            const response = await fetch(url);
            log(`Response status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                log(`Data: ${JSON.stringify(data)}`);
                if (data.items && data.items.length > 0) {
                    const item = data.items[0];
                    return {
                        title: item.snippet.title,
                        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || getThumbnailUrl(videoId),
                    };
                } else {
                    log('No items found in API response');
                }
            } else {
                const errorText = await response.text();
                log(`API Error: ${errorText}`);
            }
        }

        // Fallback to oEmbed
        log('Falling back to oEmbed');
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        log(`oEmbed status: ${response.status}`);

        if (!response.ok) {
            log('oEmbed failed');
            // Final fallback: return basic info if we have the ID
            // We can't get the title easily without API, but we can return a placeholder
            // or just fail. For now, let's try to return something usable if possible,
            // but the requirement implies we need a title.
            // If oEmbed fails (404), maybe the video doesn't exist or is private.
            console.warn(`Failed to fetch metadata for ${videoId} via API and oEmbed`);
            return null;
        }

        const data = await response.json();

        return {
            title: data.title || 'Unknown Title',
            thumbnail: getThumbnailUrl(videoId),
        };
    } catch (error) {
        log(`Error: ${error}`);
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
