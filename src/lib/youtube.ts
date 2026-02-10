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

// Helper to get rotated keys
function getApiKeys(): string[] {
    const keys = process.env.YOUTUBE_API_KEY?.split(',').map(k => k.trim()).filter(k => k) || [];
    if (keys.length === 0) {
        throw new Error('YOUTUBE_API_KEY_MISSING');
    }
    return keys;
}

// Helper to fetch with key rotation
async function fetchWithKeyRotation(urlBuilder: (key: string) => string): Promise<Response> {
    const keys = getApiKeys();
    let lastError: any;

    for (const key of keys) {
        try {
            const url = urlBuilder(key);
            const response = await fetch(url);

            if (response.ok) {
                return response;
            }

            // Check for quota error (403)
            if (response.status === 403) {
                const data = await response.json();
                const isQuotaError = data.error?.errors?.some((e: any) => e.reason === 'quotaExceeded');
                
                if (isQuotaError) {
                    console.warn(`Key ${key.substring(0, 5)}... exceeded quota. Trying next key.`);
                    continue; // Try next key
                }
            }

            // If not a quota error, return the response as is (let caller handle other errors)
            return response;
        } catch (error) {
            console.error(`Error with key ${key.substring(0, 5)}...:`, error);
            lastError = error;
            // Continue to next key on network error? Maybe. Let's assume yes for robustness.
        }
    }

    throw lastError || new Error('All API keys failed or quota exceeded.');
}

export async function getVideoMetadata(videoId: string): Promise<{ title: string; thumbnail: string } | null> {
    const fs = require('fs');
    const log = (msg: string) => {
        try {
             fs.appendFileSync('/tmp/debug_youtube.log', msg + '\n');
        } catch (e) {
            console.log('[YouTube Debug]', msg);
        }
    };

    try {
        log(`getVideoMetadata called for ${videoId}`);

        try {
            const response = await fetchWithKeyRotation((key) => 
                `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${key}`
            );

            if (response.ok) {
                const data = await response.json();
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
        } catch (apiError) {
             log(`All API keys failed: ${apiError}`);
        }

        // Fallback to oEmbed
        log('Falling back to oEmbed');
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);

        if (!response.ok) {
            log('oEmbed failed');
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
        const response = await fetchWithKeyRotation((key) =>
            `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${key}`
        );

        if (!response.ok) {
             // If fetchWithKeyRotation returned a non-ok response (that wasn't a quota error we skipped)
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
