import UserAvatar from './UserAvatar';

interface SongCardProps {
    song: {
        _id: string;
        title: string;
        thumbnail: string;
        addedByName: string;
        addedByAvatar: string;
        videoId: string;
    };
    isCurrentlyPlaying?: boolean;
    onDelete?: () => void;
    showDelete?: boolean;
    action?: React.ReactNode;
}

export default function SongCard({ song, isCurrentlyPlaying = false, onDelete, showDelete = false, action }: SongCardProps) {
    return (
        <div className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all ${isCurrentlyPlaying
            ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/50 shadow-lg shadow-purple-500/20'
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}>
            {isCurrentlyPlaying && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full animate-pulse" />
            )}

            {/* Vinyl Record Design (Only when playing) */}
            {isCurrentlyPlaying ? (
                <div className="relative w-16 h-16 flex-shrink-0 animate-spin-slow">
                    <div className="absolute inset-0 bg-zinc-900 rounded-full border-2 border-zinc-800 shadow-md flex items-center justify-center overflow-hidden">
                        <div className="w-11/12 h-11/12 rounded-full overflow-hidden relative">
                            <img
                                src={song.thumbnail}
                                alt={song.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-zinc-100 rounded-full border border-zinc-300 z-10" />
                            <div className="absolute inset-0 bg-black/10 rounded-full" />
                        </div>
                    </div>
                </div>
            ) : (
                /* Standard Rectangular Thumbnail (Queue/History) */
                <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-900 dark:text-white truncate mb-1">
                    {song.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <UserAvatar src={song.addedByAvatar} alt={song.addedByName} size="sm" />
                    <span className="truncate">{song.addedByName}</span>
                </div>
            </div>

            {action}

            {showDelete && onDelete && (
                <button
                    onClick={onDelete}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    Xóa
                </button>
            )}
        </div>
    );
}
