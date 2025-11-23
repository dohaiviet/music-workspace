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

export default function AdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [songs, setSongs] = useState<Song[]>([]);
    const [currentSongId, setCurrentSongId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const playerRef = React.useRef<any>(null);

    useEffect(() => {
        fetchUser();
        fetchUsers();
        fetchSongs();

        // Poll for updates
        const interval = setInterval(() => {
            fetchSongs();
            fetchUsers();
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const fetchUser = async () => {
        try {
            // Check if admin session exists
            const response = await fetch('/api/auth/admin-check');
            if (!response.ok) {
                router.push('/admin/login');
                return;
            }

            setUser({ _id: 'admin', name: 'Admin', avatar: '', isAdmin: true });
        } catch (error) {
            console.error('Error checking admin:', error);
            router.push('/admin/login');
        } finally {
            setIsLoading(false);
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
            alert('Failed to skip song');
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
            alert('Failed to delete song');
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
            alert('Failed to update user');
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
            alert('Xóa người dùng thất bại');
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

    const currentSong = songs.find(s => s._id === currentSongId);

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
                    <a
                        href="/"
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all"
                    >
                        Về Trang Chủ
                    </a>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Player & Queue */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* YouTube Player */}
                        {currentSong && (
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold gradient-text">Đang Phát</h2>
                                    <button
                                        onClick={handleNextSong}
                                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                                    >
                                        Bài Tiếp ⏭️
                                    </button>
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
                            </div>
                        )}

                        {/* Add Song Form */}
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6">
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
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                                Danh Sách Chờ ({songs.filter(s => s._id !== currentSongId).length})
                            </h2>
                            <div className="space-y-3">
                                {songs.filter(s => s._id !== currentSongId).length === 0 ? (
                                    <p className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                                        Chưa có bài hát nào trong danh sách
                                    </p>
                                ) : (
                                    songs
                                        .filter(s => s._id !== currentSongId)
                                        .map((song) => (
                                            <SongCard
                                                key={song._id}
                                                song={song}
                                                showDelete
                                                onDelete={() => handleDeleteSong(song._id)}
                                            />
                                        ))
                                )}
                            </div>
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
                                        <button
                                            onClick={() => handleDeleteUser(u._id)}
                                            className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
