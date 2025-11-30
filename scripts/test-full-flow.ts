
const BASE_URL = 'http://localhost:3000';

async function testEndpoint(url: string, method: string = 'GET', body?: any) {
    console.log(`Testing ${method} ${url}...`);
    try {
        const res = await fetch(`${BASE_URL}${url}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        console.log(`Status: ${res.status} ${res.statusText}`);
        if (res.status === 500) {
            console.error('ERROR: Internal Server Error');
            const text = await res.text();
            console.error(text);
        } else if (res.status === 404) {
            console.error('ERROR: Not Found');
        } else {
            console.log('OK (Reachability confirmed)');
        }
    } catch (error) {
        console.error('ERROR: Connection failed', error);
    }
    console.log('---');
}

async function runTests() {
    await testEndpoint('/api/songs');
    await testEndpoint('/api/songs', 'POST', { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    await testEndpoint('/api/songs/next', 'POST');
    await testEndpoint('/api/youtube/search?q=test');
    await testEndpoint('/api/auth/admin-check');
}

runTests();
