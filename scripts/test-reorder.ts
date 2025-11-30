
const BASE_URL = 'http://localhost:3000';

async function testReorder() {
    console.log('Fetching current songs...');
    const res = await fetch(`${BASE_URL}/api/songs`);
    if (!res.ok) {
        console.error('Failed to fetch songs:', await res.text());
        return;
    }
    const data = await res.json();
    const songs = data.songs;

    if (songs.length < 2) {
        console.log('Not enough songs to test reorder. Please add at least 2 songs.');
        return;
    }

    console.log('Current order:', songs.map((s: any) => s.title));

    // Reverse the order
    const reversedSongs = [...songs].reverse();
    const orderedIds = reversedSongs.map((s: any) => s._id);

    console.log('Sending reorder request with reversed order...');
    // Note: This requires admin authentication. 
    // Since we are running this as a script, we might need to mock auth or use a valid cookie.
    // For simplicity in this environment, I will assume I can bypass auth or I need to disable it temporarily for testing
    // OR I can try to hit the API and see if it fails with 401.

    // Actually, let's try to just run it and see. If 401, I'll need to handle auth.
    // But wait, the user is running this locally. 
    // I'll try to use a mock admin check in the API or just comment out auth for a second if needed.
    // Better yet, I will simulate the request as if I am the admin if I can.

    // Since I cannot easily get a cookie here without a browser, 
    // I will modify the API to temporarily allow this request or I will use a hardcoded secret if I can.
    // But modifying code is what I am supposed to do.

    // Let's try to hit it first.
    const reorderRes = await fetch(`${BASE_URL}/api/songs/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
    });

    if (reorderRes.status === 401) {
        console.log('Got 401 Unauthorized. This is expected if not logged in.');
        console.log('Please temporarily disable auth in /api/songs/reorder/route.ts for this test or provide a way to auth.');
        return;
    }

    if (!reorderRes.ok) {
        console.error('Reorder failed:', await reorderRes.text());
        return;
    }

    console.log('Reorder successful. Fetching songs again to verify...');
    const res2 = await fetch(`${BASE_URL}/api/songs`);
    const data2 = await res2.json();
    const newSongs = data2.songs;

    console.log('New order:', newSongs.map((s: any) => s.title));

    const isReversed = newSongs[0]._id === orderedIds[0];
    if (isReversed) {
        console.log('SUCCESS: Order updated correctly.');
    } else {
        console.error('FAILURE: Order did not update.');
    }
}

testReorder();
