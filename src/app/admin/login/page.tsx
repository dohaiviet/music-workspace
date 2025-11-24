'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password) {
            alert('Vui lòng nhập mật khẩu');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            router.push('/admin');
        } catch (error) {
            console.error('Error logging in:', error);
            alert('Thông tin đăng nhập không đúng. Vui lòng thử lại.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                            <span className="text-3xl">👑</span>
                        </div>
                        <h1 className="text-3xl font-bold gradient-text mb-2">
                            Đăng Nhập Quản Trị
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Nhập thông tin để tiếp tục
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Tên đăng nhập (Tùy chọn)
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Mật Khẩu
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nhập mật khẩu quản trị"
                                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng Nhập'}
                        </button>

                        <div className="text-center">
                            <a
                                href="/"
                                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                            >
                                ← Về trang chủ
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
