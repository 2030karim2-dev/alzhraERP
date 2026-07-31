import { useEffect } from 'react';
import { useCommandPaletteStore, CommandAction } from './store';
import {  useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../lib/themeStore';
import { MENU_ITEMS } from '../../core/constants';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { Sun, Moon } from 'lucide-react';
// FIX: Add missing import for 'React' to resolve error when using React.FC.
import React from 'react';

export const useCommandPalette = () => {
  const { isOpen, openPalette, closePalette, actions } = useCommandPaletteStore();
  return { isOpen, openPalette, closePalette, actions };
};

// Hook to register a dynamic set of commands
export const useRegisterCommands = (newActions: CommandAction[]) => {
  const registerActions = useCommandPaletteStore((state) => state.registerActions);

  useEffect(() => {
    registerActions(newActions);
  }, []); // Dependencies can be added if actions are dynamic
};


// A component that registers global commands on mount
export const GlobalCommandRegistrar: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setMode } = useThemeStore();
  const { closePalette } = useCommandPalette();

  const navActions: CommandAction[] = MENU_ITEMS.map(item => ({
    id: `nav-${item.id}`,
    title: t(item.labelKey),
    section: 'Navigation',
    icon: item.icon,
    keywords: item.path,
    onSelect: () => {
      navigate(item.path);
      closePalette();
    }
  }));

  const themeActions: CommandAction[] = [
    {
      id: 'theme-light',
      title: 'تفعيل الوضع النهاري',
      section: 'Theme',
      icon: Sun,
      keywords: 'light mode theme day',
      onSelect: () => {
        setMode('light');
        closePalette();
      }
    },
    {
      id: 'theme-dark',
      title: 'تفعيل الوضع الليلي',
      section: 'Theme',
      icon: Moon,
      keywords: 'dark mode theme night',
      onSelect: () => {
        setMode('dark');
        closePalette();
      }
    },
  ];

  useRegisterCommands([...navActions, ...themeActions]);

  return null; // This component does not render anything
};
