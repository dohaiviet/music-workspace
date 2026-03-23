'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Pusher from 'pusher-js';
import SongCard from '@/components/SongCard';

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

import UserAvatar from '@/components/UserAvatar';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

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
  const [historySongs, setHistorySongs] = useState<Song[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [radioMode, setRadioMode] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Search state
  const [searchMode, setSearchMode] = useState<'link' | 'search'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);

  const playerRef = useRef<any>(null);


  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  const handleCloseToast = useCallback(() => {
    setToast(null);
  }, []);

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      const response = await fetch(`/api/songs/history?page=${page}&limit=10`);
      if (!response.ok) return;

      const data = await response.json();
      setHistorySongs(data.songs);
      setHistoryTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, []); // Empty dependency array as it uses only local vars or setters

  useEffect(() => {
    fetchUser();
    fetchSongs();
    fetchSettings();

    const songInterval = setInterval(() => {
      fetchSongs();
      fetchSettings();
    }, 3000);
    return () => clearInterval(songInterval);
  }, []);

  useEffect(() => {
    if (user) {
      fetchHistory(historyPage);
    }
  }, [historyPage, user, fetchHistory]);

  // Pusher real-time sync
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_APP_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe('playback');
    channel.bind('sync', (data: any) => {
        if (!playerRef.current || !playerRef.current.seekTo) return;

        const { currentTime, isPlaying, broadcastMode } = data;
        
        if (broadcastMode === 'extrovert') {
            const state = playerRef.current.getPlayerState();
            if (state === 1 || state === 3) {
                playerRef.current.pauseVideo();
            }
            return;
        }

        const localTime = playerRef.current.getCurrentTime();
        
        // If difference is more than 1 second, sync it
        if (Math.abs(localTime - currentTime) > 1.0) {
            playerRef.current.seekTo(currentTime, true);
        }

        const state = playerRef.current.getPlayerState();
        if (isPlaying && state !== 1 && state !== 3) { // not playing/buffering
            playerRef.current.playVideo();
        } else if (!isPlaying && state === 1) { // playing
            playerRef.current.pauseVideo();
        }
    });

    return () => {
        pusher.unsubscribe('playback');
        pusher.disconnect();
    };
  }, []);

  // Initialize YT API
  useEffect(() => {
      if (!window.YT) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          if(firstScriptTag?.parentNode) {
              firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
          } else {
               document.head.appendChild(tag);
          }
          window.onYouTubeIframeAPIReady = () => {};
      }
      
      return () => {
          if (playerRef.current) {
              playerRef.current.destroy();
              playerRef.current = null;
          }
      };
  }, []);

  // Load video when currentSong changes
  useEffect(() => {
      if (!currentSongId) return;

      const currentSongDetail = songs.find(s => s._id === currentSongId);
      if(!currentSongDetail) return;

      const loadVideo = () => {
          if (playerRef.current && playerRef.current.loadVideoById) {
              const currentVideoUrl = playerRef.current.getVideoUrl();
              if (!currentVideoUrl || !currentVideoUrl.includes(currentSongDetail.videoId)) {
                  playerRef.current.loadVideoById(currentSongDetail.videoId);
              }
          } else if (window.YT && window.YT.Player) {
              const playerElement = document.getElementById('youtube-player-user');
              if (playerElement) {
                  playerRef.current = new window.YT.Player('youtube-player-user', {
                      videoId: currentSongDetail.videoId,
                      playerVars: {
                          autoplay: 1,
                          controls: 0,
                          disablekb: 1,
                          fs: 0,
                          rel: 0,
                          modestbranding: 1
                      },
                      events: {
                          onReady: (e: any) => {
                             e.target.playVideo();
                          }
                      }
                  });
              }
          }
      };

      if (window.YT && window.YT.Player) {
          loadVideo();
      } else {
          const checkInterval = setInterval(() => {
              if (window.YT && window.YT.Player) {
                  loadVideo();
                  clearInterval(checkInterval);
              }
          }, 100);
          return () => clearInterval(checkInterval);
      }
  }, [currentSongId, songs]);

  // ... (fetchUser and fetchSongs implementation remains potentially same, but I need to be careful not to delete them if they are in the chunk)
  // Wait, I need to match the chunk correctly.

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
      setSongs(data.songs);
      setCurrentSongId(data.currentSongId);
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };



  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setRadioMode(!!data.radioMode);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const toggleRadioMode = async () => {
    try {
      const newMode = !radioMode;
      setRadioMode(newMode); // Optimistic update
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ radioMode: newMode })
      });
      showToast(`Đã ${newMode ? 'bật' : 'tắt'} chế độ Radio`, 'success');
    } catch (error) {
      console.error('Error toggling radio mode:', error);
      showToast('Lỗi khi đổi chế độ Radio', 'error');
      setRadioMode(!radioMode); // Revert
    }
  };

  const handleHistoryPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= historyTotalPages) {
      setHistoryPage(newPage);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
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
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim(),
          message: message.trim()
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error && data.error.includes('đã có')) {
          showToast(data.error, 'warning');
          return;
        }
        throw new Error(data.error || 'Failed to add song');
      }

      setYoutubeUrl('');
      setMessage('');
      await fetchSongs();
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

  const handleQuickAdd = async (video: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error && data.error.includes('đã có')) {
          showToast(data.error, 'warning');
          return;
        }
        throw new Error(data.error || 'Failed to add song');
      }

      await fetchSongs();
      showToast('Đã thêm bài hát!', 'success');
    } catch (error) {
      console.error('Error adding song:', error);
      showToast('Thêm bài hát thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmMessageAdd = async (video: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error && data.error.includes('đã có')) {
          showToast(data.error, 'warning');
          return;
        }
        throw new Error(data.error || 'Failed to add song');
      }

      await fetchSongs();
      showToast('Đã thêm bài hát có lời nhắn!', 'success');
      setExpandedVideoId(null);
      setMessage('');
    } catch (error) {
      console.error('Error adding song:', error);
      showToast('Thêm bài hát thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keep for history replay
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
        const data = await response.json();
        if (data.error && data.error.includes('đã có')) {
          showToast(data.error, 'warning');
          return;
        }
        throw new Error(data.error || 'Failed to add song');
      }

      await fetchSongs();
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
          <div className="mb-8 cursor-pointer relative">
            <h2 className="text-2xl font-bold gradient-text mb-4 flex items-center gap-2">
              🎵 Đang Phát
            </h2>
            <SongCard song={currentSong} isCurrentlyPlaying={true} />
            
            {/* Hidden Player */}
            <div className="absolute top-0 left-0 w-0 h-0 opacity-0 overflow-hidden pointer-events-none">
               <div id="youtube-player-user" />
            </div>
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
            <form onSubmit={handleAddSong} className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Dán link YouTube vào đây..."
                  className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 relative">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Lời nhắn (tùy chọn)..."
                  className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  😃
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-full right-0 mt-2 z-50">
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                    <div className="relative z-50">
                      <EmojiPicker onEmojiClick={onEmojiClick} theme={undefined} />
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-95 whitespace-nowrap"
                >
                  {isSubmitting ? 'Đang thêm...' : 'Thêm'}
                </button>
              </div>
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
                    <div key={video.videoId} className="flex flex-col p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700">
                      <div className="flex items-center gap-3">
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleQuickAdd(video)}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap"
                          >
                            Thêm ngay
                          </button>
                          <button
                            onClick={() => {
                              if (expandedVideoId === video.videoId) {
                                setExpandedVideoId(null);
                              } else {
                                setExpandedVideoId(video.videoId);
                                setMessage('');
                              }
                            }}
                            disabled={isSubmitting}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${expandedVideoId === video.videoId
                              ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                              }`}
                          >
                            {expandedVideoId === video.videoId ? 'Đóng' : 'Lời nhắn'}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Message Input */}
                      {expandedVideoId === video.videoId && (
                        <div className="mt-3 animate-in slide-in-from-top-2">
                          <label className="block text-xs font-medium text-zinc-500 mb-2 pl-1">Lời nhắn:</label>
                          <div className="relative mb-3">
                            <textarea
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Nhập lời nhắn..."
                              className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border-none focus:ring-0 focus-visible:ring-0 p-3 min-h-[80px] text-zinc-900 dark:text-white placeholder-zinc-400 resize-none text-sm leading-relaxed custom-scrollbar shadow-inner"
                              autoFocus
                            />

                            <button
                              type="button"
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className="absolute bottom-2 right-2 p-1.5 text-zinc-400 hover:text-yellow-500 transition-colors bg-transparent hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 rounded-lg"
                            >
                              <span className="text-xl leading-none">😃</span>
                            </button>

                            <Modal
                              isOpen={showEmojiPicker}
                              onClose={() => setShowEmojiPicker(false)}
                              className="border border-zinc-200 dark:border-zinc-800"
                            >
                              <EmojiPicker onEmojiClick={onEmojiClick} theme={undefined} width={320} height={400} />
                            </Modal>
                          </div>

                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => setExpandedVideoId(null)}
                              className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors bg-white dark:bg-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700/80"
                            >
                              Hủy bỏ
                            </button>
                            <button
                              onClick={() => handleConfirmMessageAdd(video)}
                              disabled={isSubmitting}
                              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                            >
                              <span>Thêm</span>
                            </button>
                          </div>
                        </div>
                      )}
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

        {/* History */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-4 lg:p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Đã phát gần đây
            </h2>
          </div>
          <div className="space-y-3">
            {historySongs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-500 dark:text-zinc-400">
                  Chưa có lịch sử phát nhạc.
                </p>
              </div>
            ) : (
              historySongs.map((song) => (
                <SongCard
                  key={song._id}
                  song={song}
                  action={
                    <button
                      onClick={() => handleAddSearchResult(song.videoId)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      Phát lại
                    </button>
                  }
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {historyTotalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => handleHistoryPageChange(historyPage - 1)}
                disabled={historyPage === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Trước
              </button>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Trang {historyPage} / {historyTotalPages}
              </span>
              <button
                onClick={() => handleHistoryPageChange(historyPage + 1)}
                disabled={historyPage === historyTotalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={handleCloseToast}
        />
      )}

    </div>
  );
}

