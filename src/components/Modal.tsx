'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string; // For additional styling on the content container
}

export default function Modal({ isOpen, onClose, children, className = '' }: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            // Get original body overflow
            const originalStyle = window.getComputedStyle(document.body).overflow;
            // Prevent scrolling
            document.body.style.overflow = 'hidden';

            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Use portal to render outside the DOM hierarchy to avoid z-index issues
    // But for simplicity with existing code structure and without knowing if _document/layout has a portal root, 
    // we will render it normally but fixed.  Wait, portal is better.
    // Let's stick to simple fixed overlay first for consistency unless requested otherwise.
    // Actually, creating a portal is safer for z-index.
    // But let's check layout.tsx if there is a portal root. Usually there isn't one by default.
    // I'll stick to fixed positioning for now to match the user's existing "fixed inset-0" pattern
    // which seemed to work visually, just lacked scroll locking.

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={onClose} />
            <div
                className={`relative z-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200 overflow-hidden ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}
