import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

interface FloatingInputProps {
    id: string;
    label: string;
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: React.ReactNode;
    dir?: string;
    required?: boolean;
    minLength?: number;
    error?: string;
    endIcon?: React.ReactNode;
    onEndIconClick?: () => void;
    autoFocus?: boolean;
    autoComplete?: string;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
    id, label, type = 'text', value, onChange, icon, dir, required,
    minLength, error, endIcon, onEndIconClick, autoFocus, autoComplete
}) => {
    const [focused, setFocused] = useState(false);
    const isActive = focused || value.length > 0;

    return (
        <div className="relative group">
            <div className="relative">
                <div className={`absolute top-1/2 -translate-y-1/2 transition-colors duration-200 z-10
          ${dir === 'ltr' ? 'left-3' : 'right-3'}
          ${focused ? 'text-blue-500' : 'text-gray-400 dark:text-slate-500'}`}>
                    {icon}
                </div>

                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    required={required}
                    minLength={minLength}
                    autoFocus={autoFocus}
                    autoComplete={autoComplete}
                    aria-label={label}
                    aria-invalid={Boolean(error)}
                    dir={dir}
                    placeholder=" "
                    className={`
            peer w-full bg-gray-50/50 dark:bg-slate-800/50 border-2 rounded-xl
            py-3.5 text-sm text-gray-800 dark:text-slate-100
            transition-all duration-300 outline-none
            ${dir === 'ltr' ? 'pl-10 pr-10' : 'pr-10 pl-10'}
            ${error
                            ? 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                            : 'border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                        }
          `}
                />

                <label
                    htmlFor={id}
                    className={`
            absolute transition-all duration-300 pointer-events-none font-medium
            ${dir === 'ltr' ? 'left-10' : 'right-10'}
            ${isActive
                            ? `-top-2.5 text-[10px] px-1.5 bg-white dark:bg-slate-900
                 ${error ? 'text-red-500' : 'text-blue-500'}`
                            : 'top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500'
                        }
          `}
                >
                    {label}
                </label>

                {endIcon && (
                    <button
                        type="button"
                        onClick={onEndIconClick}
                        tabIndex={-1}
                        className={`absolute top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500
            hover:text-blue-500 transition-colors cursor-pointer
              ${dir === 'ltr' ? 'right-3' : 'left-3'}`}
                    >
                        {endIcon}
                    </button>
                )}
            </div>

            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -5, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -5, height: 0 }}
                        className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium"
                    >
                        <Info size={12} /> {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
};
