import { useEffect } from 'react';
import { useCommandPaletteStore, type CommandAction } from './store';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../lib/themeStore';
import { MENU_ITEMS } from '../../core/constants';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { useIsSuperAdmin } from '../auth/hooks';
import { ROUTES } from '../../core/routes/paths';
import { Sun, Moon, ShieldCheck } from 'lucide-react';
// FIX: Add missing import for 'React' to resolve error when using React.FC.
import type React from 'react';

export const useCommandPalette = () => {
  const { isOpen, openPalette, closePalette, actions } = useCommandPaletteStore();
  return { isOpen, openPalette, closePalette, actions };
};

// Hook to register a dynamic set of commands
export const useRegisterCommands = (newActions: CommandAction[]) => {
  const registerActions = useCommandPaletteStore(state => state.registerActions);

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
  const registerActions = useCommandPaletteStore(state => state.registerActions);
  const { data: isSuperAdmin } = useIsSuperAdmin();

  const navActions: CommandAction[] = MENU_ITEMS.map(item => ({
    id: `nav-${item.id}`,
    title: t(item.labelKey),
    section: 'Navigation',
    icon: item.icon,
    keywords: item.path,
    onSelect: () => {
      navigate(item.path);
      closePalette();
    },
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
      },
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
      },
    },
  ];

  // إدراج أمر الوصول لمركز تحكم المنصة عند التحقق من صلاحية السوبر أدمن.
  // الفحص غير متزامن (React Query)، لذا نعيد التسجيل بحسب اكتمال الفحص؛
  // registerActions يزيل التكرار بالمعرّف فلا تتكرر الأوامر عند إعادة التشغيل.
  const adminAction: CommandAction[] =
    isSuperAdmin === true
      ? [
          {
            id: 'nav-admin-platform',
            title: 'مركز تحكم المنصة (Super Admin)',
            section: 'Actions',
            icon: ShieldCheck,
            keywords: 'admin platform super ادارة المنصة سوبر أدمن',
            onSelect: () => {
              navigate(ROUTES.ADMIN.ROOT);
              closePalette();
            },
          },
        ]
      : [];

  useEffect(() => {
    registerActions([...navActions, ...themeActions, ...adminAction]);
    // يتغير محتوى القائمة عند اكتمال فحص السوبر أدمن فقط (لا تغيير في nav/theme الثابتة).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  return null; // This component does not render anything
};
