import { useEffect } from 'react';

export default function useLockBodyScroll() {
    useEffect(() => {
        // Get original body overflow
        const originalStyle = window.getComputedStyle(document.body).overflow;

        // Prevent scrolling
        document.body.style.overflow = 'hidden';

        // Re-enable scrolling when component unmounts
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);
}
