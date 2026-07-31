// ============================================
// ShareButton - Reusable share trigger component
// ============================================

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareModal from './ShareModal';

interface ShareButtonProps {
    /** The text message to share */
    message: string;
    /** Optional: ref to HTML element for image capture */
    elementRef?: React.RefObject<HTMLElement>;
    /** Modal title */
    title?: string;
    /** Event type for logging */
    eventType?: string;
    /** Button size variant */
    size?: 'sm' | 'md';
    /** Additional CSS classes */
    className?: string;
    /** Show label text */
    showLabel?: boolean;
}

const ShareButton: React.FC<ShareButtonProps> = ({
    message,
    elementRef,
    title = 'مشاركة',
    eventType = 'share',
    size = 'sm',
    className = '',
    showLabel = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const iconSize = size === 'sm' ? 16 : 20;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`inline-flex items-center justify-center gap-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-all ${size === 'sm' ? 'p-1.5' : 'px-3 py-2'
                    } ${className}`}
                title="مشاركة عبر واتساب/تليجرام"
            >
                <Share2 size={iconSize} />
                {showLabel && <span className="text-xs font-bold">مشاركة</span>}
            </button>

            <ShareModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                message={message}
                elementRef={elementRef}
                title={title}
                eventType={eventType}
            />
        </>
    );
};

export default ShareButton;
