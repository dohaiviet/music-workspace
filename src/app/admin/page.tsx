'use client';

// YouTube IFrame Player API type declarations
declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTheme } from '@/providers/ThemeProvider';
import AdminThemeSelector from '@/components/theme/AdminThemeSelector';

import SongCard from '@/components/SongCard';
import UserAvatar from '@/components/UserAvatar';
import Toast from '@/components/Toast';
import ScrollingMessage from '@/components/ScrollingMessage';
import Modal from '@/components/Modal';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

// Sortable Item Component
function SortableSongItem({ song, onDelete }: { song: Song; onDelete: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: song._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1000 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <SongCard song={song} showDelete onDelete={onDelete} />
        </div>
    );
}

interface User {
    _id: string;
    name: string;
    username?: string;
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
    message?: string;
}

export default function AdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [songs, setSongs] = useState<Song[]>([]);
    const [historySongs, setHistorySongs] = useState<Song[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [currentSongId, setCurrentSongId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search state
    const [searchMode, setSearchMode] = useState<'link' | 'search'>('link');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [clientPlayback, setClientPlayback] = useState(false);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setToast({ message, type });
    };

    const currentSong = songs.find(s => s._id === currentSongId);

    const playerRef = React.useRef<any>(null);

    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false);

    // Theme Logic
    const { theme, setTheme } = useTheme();

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = () => {
        setIsDragging(true);
        isDraggingRef.current = true;
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        setIsDragging(false);
        // isDraggingRef.current = false; // Moved to finally block

        if (active.id !== over?.id) {
            // Calculate new order
            const queue = currentSong ? songs.slice(1) : songs;
            const oldIndex = queue.findIndex((item) => item._id === active.id);
            const newIndex = queue.findIndex((item) => item._id === over?.id);

            const newQueue = arrayMove(queue, oldIndex, newIndex);

            // Optimistic update
            const newSongs = currentSong ? [currentSong, ...newQueue] : newQueue;
            setSongs(newSongs);

            // Call API to persist order
            try {
                console.log('Sending reorder request:', newSongs.map(s => s._id));
                const response = await fetch('/api/songs/reorder', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderedIds: newSongs.map(s => s._id) }),
                });

                if (!response.ok) {
                    throw new Error('Reorder failed');
                }
                console.log('Reorder success');
                // alert('Reorder success'); // Debug - commented out to avoid popup spam
                fetchSongs(); // Force sync with server
            } catch (error) {
                console.error('Failed to reorder songs:', error);
                showToast('Không thể sắp xếp lại danh sách: ' + String(error), 'error');
                // Revert on error
                fetchSongs();
            } finally {
                isDraggingRef.current = false;
            }
        } else {
            isDraggingRef.current = false;
        }
    };

    useEffect(() => {
        fetchUser();
        fetchUsers();
        fetchSongs();
        fetchSettings();

        // Poll for updates
        const interval = setInterval(() => {
            if (!isDraggingRef.current) {
                fetchSongs();
                fetchUsers();
                fetchSettings();
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchHistory(historyPage);
    }, [historyPage]);

    const fetchUser = async () => {
        try {
            // Check if admin session exists
            const response = await fetch('/api/auth/admin-check');
            if (!response.ok) {
                router.push('/admin/login');
                return;
            }

            // We need to fetch the actual user details to know if they are super admin
            const userResponse = await fetch('/api/auth/me');
            const userData = await userResponse.json();

            setUser(userData.user);
        } catch (error) {
            console.error('Error checking admin:', error);
            router.push('/admin/login');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setClientPlayback(!!data.clientPlayback);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const toggleClientPlayback = async () => {
        try {
            const newMode = !clientPlayback;
            setClientPlayback(newMode);
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientPlayback: newMode })
            });
            showToast(`Đã ${newMode ? 'bật' : 'tắt'} phát trên thiết bị User`, 'success');
        } catch (error) {
            console.error('Error toggling client playback:', error);
            showToast('Lỗi khi đổi chế độ phát nhạc', 'error');
            setClientPlayback(!clientPlayback);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) return;
            const data = await response.json();
            setUsers(data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
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

    const fetchHistory = async (page = 1) => {
        try {
            const response = await fetch(`/api/songs/history?page=${page}&limit=10`);
            if (!response.ok) return;
            const data = await response.json();
            setHistorySongs(data.songs);
            setHistoryTotalPages(data.pagination.pages);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const handleHistoryPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= historyTotalPages) {
            setHistoryPage(newPage);
            fetchHistory(newPage);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử phát nhạc? Hành động này không thể hoàn tác.')) return;

        try {
            const response = await fetch('/api/songs/history', {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to clear history');
            }

            fetchHistory(1);
            showToast('Đã xóa toàn bộ lịch sử', 'success');
        } catch (error) {
            console.error('Error clearing history:', error);
            showToast('Xóa lịch sử thất bại', 'error');
        }
    };

    const handleNextSong = async () => {
        try {
            const response = await fetch('/api/songs/next', {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to skip song');
            }

            fetchSongs();
        } catch (error) {
            console.error('Error skipping song:', error);
            showToast('Không thể chuyển bài', 'error');
        }
    };

    const handleDeleteSong = async (songId: string) => {
        if (!confirm('Are you sure you want to delete this song?')) return;

        try {
            const response = await fetch(`/api/songs/${songId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete song');
            }

            fetchSongs();
        } catch (error) {
            console.error('Error deleting song:', error);
            showToast('Xóa bài hát thất bại', 'error');
        }
    };

    const handleDeleteHistorySong = async (songId: string) => {
        if (!confirm('Bạn có chắc muốn xóa bài hát này khỏi lịch sử?')) return;

        try {
            const response = await fetch(`/api/songs/${songId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete song');
            }

            fetchHistory(historyPage);
            showToast('Đã xóa bài hát khỏi lịch sử', 'success');
        } catch (error) {
            console.error('Error deleting song:', error);
            showToast('Xóa bài hát thất bại', 'error');
        }
    };

    const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isAdmin: !currentIsAdmin }),
            });

            if (!response.ok) {
                throw new Error('Failed to update user');
            }

            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            showToast('Cập nhật người dùng thất bại', 'error');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            showToast('Xóa người dùng thất bại', 'error');
        }
    };

    // ... (rest of the file)

    // Wait, I should do two separate replace calls or one smart one.
    // The instruction above asked to ADD the function AND UPDATE the UI.
    // But the ReplacementContent above only includes the functions.
    // I will split this into two steps for safety, or try to do it in one if I can match the large block.
    // The file is large, matching a huge block is risky.
    // I'll stick to adding the function first.

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
                    message: message.trim() || undefined
                }),
            });

            if (!response.ok) {
                const data = await response.json();
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

    const handleQuickAdd = async (videoId: string) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/songs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
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

    const handleAddSearchResult = async (videoId: string) => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/songs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
                    message: message.trim() || undefined
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add song');
            }

            await fetchSongs();
            // Optional: Clear search or show success message
            showToast('Đã thêm bài hát vào danh sách!', 'success');
            setMessage('');
        } catch (error) {
            console.error('Error adding song:', error);
            showToast('Thêm bài hát thất bại', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };



    // Initialize YouTube Player once
    useEffect(() => {
        // Load YT API if not loaded
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => {
                // API loaded, player will be created in the next effect
            };
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
        if (!currentSong?.videoId) return;

        const loadVideo = () => {
            if (playerRef.current && playerRef.current.loadVideoById) {
                // Player already exists, just load new video
                playerRef.current.loadVideoById(currentSong.videoId);
            } else if (window.YT && window.YT.Player) {
                // Create player for the first time
                const playerElement = document.getElementById('youtube-player');
                if (playerElement) {
                    playerRef.current = new window.YT.Player('youtube-player', {
                        videoId: currentSong.videoId,
                        playerVars: {
                            autoplay: 1,
                            enablejsapi: 1,
                        },
                        events: {
                            onStateChange: onPlayerStateChange,
                        },
                    });
                }
            }
        };

        // If YT API is ready, load video immediately
        if (window.YT && window.YT.Player) {
            loadVideo();
        } else {
            // Wait for API to be ready
            const checkInterval = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    loadVideo();
                    clearInterval(checkInterval);
                }
            }, 100);

            return () => clearInterval(checkInterval);
        }
    }, [currentSong?.videoId]);

    // Handle YouTube player state change
    const onPlayerStateChange = (event: any) => {
        // PlayerState.ENDED = 0
        if (event.data === 0) {
            console.log('Video ended, auto playing next song...');
            setTimeout(() => {
                handleNextSong();
            }, 1000); // Small delay before next song
        }
    };

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50 to-pink-50 dark:from-zinc-950 dark:via-purple-950/20 dark:to-pink-950/20">
            {/* Header */}
            <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">👑</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold gradient-text">Quản Trị Viên</h1>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Admin</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <AdminThemeSelector />

                        <a
                            href="/"
                            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all"
                        >
                            Về Trang Chủ
                        </a>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-4 lg:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Left Column - Player & Queue */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Now Playing Section */}
                        {currentSong && (
                            <div className="mb-8">
                                {user?.username === 'admin' ? (
                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-4 lg:p-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                                            <h2 className="text-xl font-bold gradient-text">Đang Phát</h2>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={toggleClientPlayback}
                                                    className={`px-4 py-2 cursor-pointer rounded-lg font-medium transition-all active:scale-95 whitespace-nowrap text-sm flex-1 sm:flex-none ${
                                                        clientPlayback 
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' 
                                                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                                                    }`}
                                                >
                                                    {clientPlayback ? 'Hướng nội' : 'Hướng ngoại'}
                                                </button>
                                                <button
                                                    onClick={handleNextSong}
                                                    className="w-full sm:w-auto cursor-pointer flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transition-all active:scale-95"
                                                >
                                                    Bài Tiếp ⏭️
                                                </button>
                                            </div>
                                        </div>
                                        <div className="aspect-video rounded-xl overflow-hidden mb-4">
                                            <div
                                                id="youtube-player"
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        </div>
                                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">{currentSong.title}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <UserAvatar src={currentSong.addedByAvatar} alt={currentSong.addedByName} size="sm" />
                                            <span className="text-sm text-zinc-600 dark:text-zinc-400">Được thêm bởi {currentSong.addedByName}</span>
                                        </div>
                                        {currentSong.message && (
                                            <ScrollingMessage message={currentSong.message} senderName={currentSong.addedByName} />
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-4 lg:p-6">
                                        <h2 className="text-xl font-bold gradient-text mb-4">🎵 Đang Phát</h2>
                                        <SongCard song={currentSong} isCurrentlyPlaying={true} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Add Song Section */}
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-4 lg:p-6">
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
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-95 whitespace-nowrap"
                                        >
                                            {isSubmitting ? 'Đang thêm...' : 'Thêm'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Lời nhắn (tùy chọn)..."
                                        className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <form onSubmit={handleSearch} className="flex gap-3">
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
                                                                onClick={() => handleQuickAdd(video.videoId)}
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
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                    Danh Sách Chờ ({currentSong ? songs.length - 1 : songs.length})
                                </h2>
                                {(currentSong ? songs.slice(1) : songs).length > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (!confirm('Bạn có chắc muốn xóa toàn bộ danh sách chờ? (Bài đang phát sẽ được giữ lại)')) return;

                                            try {
                                                const response = await fetch('/api/songs', {
                                                    method: 'DELETE',
                                                });

                                                if (!response.ok) throw new Error('Failed to clear queue');

                                                fetchSongs();
                                                showToast('Đã xóa danh sách chờ', 'success');
                                            } catch (error) {
                                                console.error('Error clearing queue:', error);
                                                showToast('Xóa danh sách thất bại', 'error');
                                            }
                                        }}
                                        className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        Xóa hết
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                {(currentSong ? songs.slice(1) : songs).length === 0 ? (
                                    <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                                        Chưa có bài hát nào trong danh sách
                                    </p>
                                ) : (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={(currentSong ? songs.slice(1) : songs).map(s => s._id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {(currentSong ? songs.slice(1) : songs).map((song) => (
                                                <SortableSongItem
                                                    key={song._id}
                                                    song={song}
                                                    onDelete={() => handleDeleteSong(song._id)}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </div>
                        </div>

                        {/* History */}
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-4 lg:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                    Đã phát gần đây
                                </h2>
                                <div className="flex gap-2">
                                    {historySongs.length > 0 && (
                                        <button
                                            onClick={handleClearHistory}
                                            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            Xóa hết
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {historySongs.length === 0 ? (
                                    <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                                        Chưa có lịch sử phát nhạc
                                    </p>
                                ) : (
                                    historySongs.map((song) => (
                                        <SongCard
                                            key={song._id}
                                            song={song}
                                            showDelete
                                            onDelete={() => handleDeleteHistorySong(song._id)}
                                            action={
                                                <button
                                                    onClick={() => handleAddSearchResult(song.videoId)}
                                                    disabled={isSubmitting}
                                                    className="px-3 cursor-pointer py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
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
                                <div className="flex justify-center items-center gap-4 pt-8">
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
                    </div>

                    {/* Right Column - Users */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                            Người Dùng ({users.length})
                        </h2>
                        <div className="space-y-3">
                            {users.map((u) => (
                                <div
                                    key={u._id}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                                >
                                    <UserAvatar src={u.avatar} alt={u.name} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-zinc-900 dark:text-white truncate">{u.name}</p>
                                        {u.isAdmin && (
                                            <span className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-0.5 rounded-full">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {user?.username === 'admin' && u.username !== 'admin' && (
                                            <button
                                                onClick={() => handleToggleAdmin(u._id, u.isAdmin)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${u.isAdmin
                                                    ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                                                    : 'bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50'
                                                    }`}
                                            >
                                                {u.isAdmin ? 'Hủy quyền' : 'Cấp quyền'}
                                            </button>
                                        )}
                                        {!u.isAdmin && (
                                            <button
                                                onClick={() => handleDeleteUser(u._id)}
                                                className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                title="Xóa người dùng"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
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
