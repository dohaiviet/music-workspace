'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/UserAvatar';

const PRESET_AVATARS = [
    { id: 'cat', name: 'Cat', path: '/avatars/avatar_cat.png' },
    { id: 'dog', name: 'Dog', path: '/avatars/avatar_dog.png' },
    { id: 'panda', name: 'Panda', path: '/avatars/avatar_panda.png' },
    { id: 'fox', name: 'Fox', path: '/avatars/avatar_fox.png' },
    { id: 'rabbit', name: 'Rabbit', path: '/avatars/avatar_rabbit.png' },
    { id: 'bear', name: 'Bear', path: '/avatars/avatar_bear.png' },
];

export default function WelcomePage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !avatar) {
            alert('Vui lòng điền đầy đủ tên và chọn avatar');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: name.trim(), avatar }),
            });

            if (!response.ok) {
                throw new Error('Failed to create user');
            }

            router.push('/');
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Tạo tài khoản thất bại. Vui lòng thử lại.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold gradient-text mb-2">
                            Chào Mừng! 🎵
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Tham gia danh sách nhạc và chia sẻ bài hát yêu thích
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Tên Của Bạn
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nhập tên của bạn"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                                Chọn Avatar Của Bạn
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {PRESET_AVATARS.map((presetAvatar) => (
                                    <button
                                        key={presetAvatar.id}
                                        type="button"
                                        onClick={() => setAvatar(presetAvatar.path)}
                                        className={`relative p-2 rounded-xl border-2 transition-all hover:scale-105 ${avatar === presetAvatar.path
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg'
                                            : 'border-zinc-200 dark:border-zinc-700 hover:border-purple-300'
                                            }`}
                                    >
                                        <div className="w-full aspect-square rounded-lg overflow-hidden">
                                            <img
                                                src={presetAvatar.path}
                                                alt={presetAvatar.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {avatar === presetAvatar.path && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim() || !avatar}
                            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isSubmitting ? 'Đang tham gia...' : 'Tham Gia 🚀'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
