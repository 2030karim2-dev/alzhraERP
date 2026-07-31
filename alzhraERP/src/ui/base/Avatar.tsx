import React from 'react';
import { cn } from '../../core/utils';

interface AvatarProps {
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', className }) => {
    const getInitials = (n: string) => {
        return n
            .split(' ')
            .map(part => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const getColor = (n: string) => {
        const colors = [
            'bg-blue-500',
            'bg-emerald-500',
            'bg-indigo-500',
            'bg-violet-500',
            'bg-rose-500',
            'bg-amber-500',
            'bg-cyan-500'
        ];
        let hash = 0;
        for (let i = 0; i < n.length; i++) {
            hash = n.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const sizeClasses = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base'
    };

    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-full text-white font-bold shadow-sm shrink-0",
                getColor(name),
                sizeClasses[size],
                className
            )}
        >
            {getInitials(name)}
        </div>
    );
};

export default Avatar;
