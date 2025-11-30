'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SongCard from '@/components/SongCard';
import UserAvatar from '@/components/UserAvatar';
import Toast from '@/components/Toast';

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

  // Search state
  const [searchMode, setSearchMode] = useState<'link' | 'search'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

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
      showToast(error.message || 'Thêm bài hát thất bại. Vui lòng kiểm tra link và thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setSearchResults(data.videos);
    } catch (error: any) {
      console.error('Error searching:', error);
      showToast(error.message || 'Tìm kiếm thất bại', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSearchResult = async (videoId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl: `https://www.youtube.com/watch?v=${videoId}` }),
      });

      if (!response.ok) {
        throw new Error('Failed to add song');
      }

      fetchSongs();
      showToast('Đã thêm bài hát vào danh sách!', 'success');
    } catch (error) {
      console.error('Error adding song:', error);
      showToast('Thêm bài hát thất bại', 'error');
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

      <main className="max-w-4xl mx-auto px-4 py-4 lg:py-8">
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
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-4 lg:p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Thêm Bài Hát
            </h2>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 w-full sm:w-auto">
              <button
                onClick={() => setSearchMode('search')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all ${searchMode === 'search'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
              >
                Tìm Kiếm
              </button>
              <button
                onClick={() => setSearchMode('link')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all ${searchMode === 'link'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
              >
                Link YouTube
              </button>
            </div>
          </div>

          {searchMode === 'link' ? (
            <form onSubmit={handleAddSong} className="flex flex-col sm:flex-row gap-3">
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
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-95"
              >
                {isSubmitting ? 'Đang thêm...' : 'Thêm'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập tên bài hát..."
                  className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full sm:w-auto px-8 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all disabled:opacity-50 active:scale-95"
                >
                  {isSearching ? '...' : 'Tìm'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {searchResults.map((video) => (
                    <div key={video.videoId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-24 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-zinc-900 dark:text-white truncate" title={video.title}>
                          {video.title}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {video.channelTitle}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddSearchResult(video.videoId)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-200 dark:hover:bg-purple-900/50"
                      >
                        Thêm
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Queue */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-4 lg:p-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

