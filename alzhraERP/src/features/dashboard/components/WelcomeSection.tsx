import React from 'react';
import { useAuthStore } from '../../auth/store'; // Assuming auth store exists
import { Calendar } from 'lucide-react';
import { APP_NAME } from '../../../core/constants';

const WelcomeSection: React.FC = () => {
    const { user } = useAuthStore();
    const currentDate = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="bg-[var(--app-surface)] rounded-3xl p-6 shadow-sm border border-[var(--app-border)] mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 dark:bg-blue-900/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--app-text)] mb-2">
                        مرحباً، <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-emerald-600">{user?.name || 'مستخدم'}</span> 👋
                    </h1>
                    <p className="text-[var(--app-text-secondary)] text-sm font-medium">
                        أهلاً بك في {APP_NAME}. إليك نظرة عامة على نشاطك اليوم.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-[var(--app-surface-hover)] px-4 py-2 rounded-2xl border border-[var(--app-border)]">
                    <Calendar size={18} className="text-blue-600" />
                    <span className="text-sm font-bold text-[var(--app-text)] font-mono">
                        {currentDate}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default WelcomeSection;
