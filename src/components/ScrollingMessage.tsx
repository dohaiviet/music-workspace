import React from 'react';

interface ScrollingMessageProps {
    message: string;
    senderName: string;
    className?: string;
}

export default function ScrollingMessage({ message, senderName, className = '' }: ScrollingMessageProps) {
    if (!message) return null;

    return (
        <div
            className={`w-full overflow-hidden py-2 mt-4 relative ${className}`}
            style={{
                maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
            }}
        >
            <div className="whitespace-nowrap animate-marquee flex items-center gap-8">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="font-bold text-purple-600 dark:text-purple-400">{senderName}:</span> {message}
                </span>
                {/* Duplicate for seamless loop if needed, though simple marquee just restarts */}
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="font-bold text-purple-600 dark:text-purple-400">{senderName}:</span> {message}
                </span>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="font-bold text-purple-600 dark:text-purple-400">{senderName}:</span> {message}
                </span>
            </div>
        </div>
    );
}
