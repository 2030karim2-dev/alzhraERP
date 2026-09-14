import React from 'react';

/**
 * WhatsApp-style subtle doodle background pattern.
 * Adaptive to both Dark and Light themes using Tailwind CSS variables.
 */
export const ChatWallpaper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-[var(--app-bg)]">
      {/* Subtle WhatsApp-style doodle background texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, currentColor 2%, transparent 0%), radial-gradient(circle at 75px 75px, currentColor 2%, transparent 0%)`,
          backgroundSize: '100px 100px',
        }}
      />
      {children}
    </div>
  );
};
