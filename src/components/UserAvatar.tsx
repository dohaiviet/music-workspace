interface UserAvatarProps {
    src: string;
    alt: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function UserAvatar({ src, alt, size = 'md' }: UserAvatarProps) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    return (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-shrink-0`}>
            <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover"
            />
        </div>
    );
}
