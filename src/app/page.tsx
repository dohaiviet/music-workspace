'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SongCard from '@/components/SongCard';
import UserAvatar from '@/components/UserAvatar';

interface User {
  _id: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
}

interface Song {
  _id: string;
  title: string;
  thumbnail: string;
  addedByName: string;
  addedByAvatar: string;
  videoId: string;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch current user
    fetchUser();

    // Fetch songs
    fetchSongs();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/welcome');
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/welcome');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSongs = async () => {
    try {
      const response = await fetch('/api/songs');
      if (!response.ok) return;

      const data = await response.json();
      setSongs(data.songs);
      setCurrentSongId(data.currentSongId);
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!youtubeUrl.trim()) {
      alert('Vui lòng nhập link YouTube');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add song');
      }

      setYoutubeUrl('');
      fetchSongs();
    } catch (error: any) {
      console.error('Error adding song:', error);
      alert(error.message || 'Thêm bài hát thất bại. Vui lòng kiểm tra link và thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll for updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchSongs, 3000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentSong = songs.find(s => s._id === currentSongId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50 to-pink-50 dark:from-zinc-950 dark:via-purple-950/20 dark:to-pink-950/20">
      {/* Header */}
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar src={user.avatar} alt={user.name} size="md" />
            <div>
              <p className="font-semibold text-zinc-900 dark:text-white">{user.name}</p>
              {user.isAdmin && (
                <span className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </div>
          </div>
          {user.isAdmin && (
            <a
              href="/admin"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              Quản Trị
            </a>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Currently Playing */}
        {currentSong ? (
          <div className="mb-8">
            <h2 className="text-2xl font-bold gradient-text mb-4 flex items-center gap-2">
              🎵 Đang Phát
            </h2>
            <SongCard song={currentSong} isCurrentlyPlaying={true} />
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded-full flex items-center justify-center">
                <span className="text-4xl opacity-50">⏸️</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                Chưa Có Bài Hát Nào Đang Phát
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Đợi admin bật nhạc hoặc thêm bài hát vào danh sách!
              </p>
            </div>
          </div>
        )}

        {/* Add Song Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
            Thêm Bài Hát
          </h2>
          <form onSubmit={handleAddSong} className="flex gap-3">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Dán link YouTube vào đây..."
              className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? 'Đang thêm...' : 'Thêm'}
            </button>
          </form>
        </div>

        {/* Queue */}
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
            Danh Sách Chờ ({songs.filter(s => s._id !== currentSongId).length})
          </h2>
          <div className="space-y-3">
            {songs.filter(s => s._id !== currentSongId).length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl">
                <p className="text-zinc-500 dark:text-zinc-400">
                  Chưa có bài hát nào trong danh sách. Hãy là người đầu tiên thêm! 🎶
                </p>
              </div>
            ) : (
              songs
                .filter(s => s._id !== currentSongId)
                .map((song) => (
                  <SongCard key={song._id} song={song} />
                ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
