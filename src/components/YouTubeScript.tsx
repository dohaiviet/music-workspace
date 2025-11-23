import Script from 'next/script';

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

export default function YouTubeScript() {
    return (
        <Script
            src="https://www.youtube.com/iframe_api"
            strategy="lazyOnload"
        />
    );
}
