import React, { useState } from 'react';
import { MapPin, Volume2, VolumeX, Radio, Bell, CheckCircle2, Square } from 'lucide-react';
import { POPULAR_CITIES, type PresetCity } from '../dhikrStore';
import { ADHAN_RECITERS, playAdhanSound, stopAdhanSound } from '../playAdhan';
import type { AdhanReciterId } from '../types';

interface AdhanSettingsBarProps {
  city: string | null;
  setPresetCity: (city: PresetCity) => void;
  detectGpsLocation: () => Promise<{ success: boolean; city?: string; error?: string }>;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  adhanReciter?: AdhanReciterId;
  setAdhanReciter: (r: AdhanReciterId) => void;
  playingAdhan: boolean;
}

interface CityDropdownMenuProps {
  city: string | null;
  onSelectCity: (c: PresetCity) => void;
}

const CityDropdownMenu: React.FC<CityDropdownMenuProps> = ({ city, onSelectCity }) => (
  <div className="custom-scrollbar animate-in zoom-in-95 absolute right-0 top-full z-50 mt-2 max-h-64 w-72 overflow-y-auto rounded-2xl border border-emerald-500/30 bg-white p-2 shadow-2xl duration-200 dark:bg-slate-800">
    <div className="border-b border-slate-100 p-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-700">
      اختر المدينة (اليمن والخليج)
    </div>
    <div className="py-1">
      {POPULAR_CITIES.map(c => {
        const isSelected = typeof city === 'string' && city.includes(c.name);
        return (
          <button
            key={`${c.name}-${c.country}`}
            type="button"
            onClick={() => {
              onSelectCity(c);
            }}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-xs font-bold transition-colors ${
              isSelected
                ? 'bg-emerald-600 text-white'
                : 'text-slate-800 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>{c.name}</span>
            <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
              {c.country}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

interface CitySelectButtonProps {
  displayCity: string;
  showDropdown: boolean;
  onToggleDropdown: () => void;
}

const CitySelectButton: React.FC<CitySelectButtonProps> = ({
  displayCity,
  showDropdown,
  onToggleDropdown,
}) => (
  <button
    type="button"
    onClick={onToggleDropdown}
    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-300"
  >
    <MapPin size={14} className="text-emerald-600" />
    <span>المدينة: {displayCity}</span>
    <span className="rounded bg-emerald-100 px-1.5 text-[10px] text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
      {showDropdown ? '▲' : '▼'}
    </span>
  </button>
);

interface GpsButtonProps {
  isLocating: boolean;
  onGps: () => void;
}

const GpsButton: React.FC<GpsButtonProps> = ({ isLocating, onGps }) => (
  <button
    type="button"
    onClick={onGps}
    disabled={isLocating}
    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-xs hover:bg-emerald-50 disabled:opacity-50 dark:bg-slate-800 dark:text-emerald-300"
  >
    <MapPin
      size={14}
      className={isLocating ? 'animate-bounce text-emerald-500' : 'text-emerald-500'}
    />
    <span>{isLocating ? 'جاري تحديد GPS...' : 'تحديد الموقع تلقائياً'}</span>
  </button>
);

interface SoundToggleProps {
  soundEnabled: boolean;
  onToggle: () => void;
}

const SoundToggleButton: React.FC<SoundToggleProps> = ({ soundEnabled, onToggle }) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
        soundEnabled
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800'
      }`}
    >
      {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
      <span>{soundEnabled ? 'صوت الأذان مفعل' : 'مكتوم'}</span>
    </button>
  </div>
);

interface CityGpsBarProps {
  city: string | null;
  setPresetCity: (city: PresetCity) => void;
  detectGpsLocation: () => Promise<{ success: boolean; city?: string; error?: string }>;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const GpsStatusLabel: React.FC<{ status: string | null }> = ({ status }) => {
  if (typeof status !== 'string' || status.length === 0) return null;
  return (
    <span className="w-full text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
      {status}
    </span>
  );
};

const CityGpsBar: React.FC<CityGpsBarProps> = ({
  city,
  setPresetCity,
  detectGpsLocation,
  soundEnabled,
  setSoundEnabled,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const displayCity = typeof city === 'string' && city.length > 0 ? city : 'الرياض';

  const handleGps = async (): Promise<void> => {
    setIsLocating(true);
    setGpsStatus('جاري تحديد الموقع...');
    const res = await detectGpsLocation();
    setIsLocating(false);
    const msg = res.success ? `تم التحديد: ${res.city ?? ''}` : (res.error ?? 'تعذر جلب الموقع');
    setGpsStatus(msg);
    setTimeout(() => {
      setGpsStatus(null);
    }, 4000);
  };

  return (
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 dark:bg-emerald-950/30 sm:flex-row sm:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <CitySelectButton
            displayCity={displayCity}
            showDropdown={showDropdown}
            onToggleDropdown={() => {
              setShowDropdown(!showDropdown);
            }}
          />
          {showDropdown && (
            <CityDropdownMenu
              city={city}
              onSelectCity={c => {
                setPresetCity(c);
                setShowDropdown(false);
              }}
            />
          )}
        </div>
        <GpsButton
          isLocating={isLocating}
          onGps={() => {
            void handleGps();
          }}
        />
      </div>

      <SoundToggleButton
        soundEnabled={soundEnabled}
        onToggle={() => {
          setSoundEnabled(!soundEnabled);
        }}
      />

      <GpsStatusLabel status={gpsStatus} />
    </div>
  );
};

interface ReciterGridProps {
  adhanReciter: AdhanReciterId | undefined;
  setAdhanReciter: (r: AdhanReciterId) => void;
  playingAdhan: boolean;
  volume: number;
}

const ReciterGrid: React.FC<ReciterGridProps> = ({
  adhanReciter,
  setAdhanReciter,
  playingAdhan,
  volume,
}) => {
  const currentReciter =
    typeof adhanReciter === 'string' && adhanReciter.length > 0 ? adhanReciter : 'makkah';

  return (
    <div className="mb-4">
      <p className="mb-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
        اختر صوت الأذان المفضل:
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ADHAN_RECITERS.map(rec => {
          const isSelected = currentReciter === rec.id;
          return (
            <button
              key={rec.id}
              type="button"
              onClick={() => {
                setAdhanReciter(rec.id);
                if (playingAdhan) {
                  void playAdhanSound({ previewMode: true, reciterId: rec.id, volume });
                }
              }}
              className={`flex flex-col items-start rounded-xl border p-2.5 text-right transition-all ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-xs ring-1 ring-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-bold">{rec.name}</span>
                {isSelected && <CheckCircle2 size={14} className="text-emerald-600" />}
              </div>
              <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                {rec.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface PlayAdhanButtonProps {
  playingAdhan: boolean;
  onToggle: () => void;
}

const PlayAdhanButton: React.FC<PlayAdhanButtonProps> = ({ playingAdhan, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-md transition-all active:scale-95 ${
      playingAdhan
        ? 'bg-rose-600 text-white hover:bg-rose-700'
        : 'bg-emerald-600 text-white hover:bg-emerald-700'
    }`}
  >
    {playingAdhan ? (
      <>
        <Square size={14} className="fill-current" />
        <span>إيقاف صوت الأذان</span>
      </>
    ) : (
      <>
        <Volume2 size={14} />
        <span>تجربة وسماع صوت الأذان 🔊</span>
      </>
    )}
  </button>
);

interface VolumeControlsProps {
  volume: number;
  setVolume: (v: number) => void;
  playingAdhan: boolean;
  onToggleAdhanAudio: () => void;
}

const VolumeControls: React.FC<VolumeControlsProps> = ({
  volume,
  setVolume,
  playingAdhan,
  onToggleAdhanAudio,
}) => (
  <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/80 sm:flex-row sm:items-center">
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => {
          setVolume(volume > 0 ? 0 : 0.9);
        }}
        className="text-slate-500 hover:text-emerald-600 dark:text-slate-400"
        title={volume > 0 ? 'كتم الصوت' : 'تشغيل الصوت'}
      >
        {volume > 0 ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={e => {
            setVolume(parseFloat(e.target.value));
          }}
          className="h-2 w-28 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-emerald-600 dark:bg-slate-700"
        />
        <span className="w-10 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
    <PlayAdhanButton playingAdhan={playingAdhan} onToggle={onToggleAdhanAudio} />
  </div>
);

interface AudioHeaderProps {
  notifPermission: string;
  onRequestNotif: () => void;
}

const AudioHeader: React.FC<AudioHeaderProps> = ({ notifPermission, onRequestNotif }) => (
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
    <div className="flex items-center gap-2">
      <Radio size={16} className="text-emerald-600 dark:text-emerald-400" />
      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
        مركز التحكم بصوت الأذان والمؤذن
      </span>
    </div>
    {notifPermission !== 'granted' && (
      <button
        type="button"
        onClick={onRequestNotif}
        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300"
      >
        <Bell size={12} />
        تفعيل إشعارات سطح المكتب
      </button>
    )}
  </div>
);

interface AudioCenterBoxProps {
  notifPermission: string;
  onRequestNotif: () => void;
  adhanReciter?: AdhanReciterId | undefined;
  setAdhanReciter: (r: AdhanReciterId) => void;
  playingAdhan: boolean;
  volume: number;
  setVolume: (v: number) => void;
  onToggleAudio: () => void;
}

const AudioCenterBox: React.FC<AudioCenterBoxProps> = ({
  notifPermission,
  onRequestNotif,
  adhanReciter,
  setAdhanReciter,
  playingAdhan,
  volume,
  setVolume,
  onToggleAudio,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
    <AudioHeader notifPermission={notifPermission} onRequestNotif={onRequestNotif} />
    <ReciterGrid
      adhanReciter={adhanReciter}
      setAdhanReciter={setAdhanReciter}
      playingAdhan={playingAdhan}
      volume={volume}
    />
    <VolumeControls
      volume={volume}
      setVolume={setVolume}
      playingAdhan={playingAdhan}
      onToggleAdhanAudio={onToggleAudio}
    />
  </div>
);

export const AdhanSettingsBar: React.FC<AdhanSettingsBarProps> = ({
  city,
  setPresetCity,
  detectGpsLocation,
  soundEnabled,
  setSoundEnabled,
  volume,
  setVolume,
  adhanReciter,
  setAdhanReciter,
  playingAdhan,
}) => {
  const [notifPermission, setNotifPermission] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  return (
    <div className="space-y-4">
      <CityGpsBar
        city={city}
        setPresetCity={setPresetCity}
        detectGpsLocation={detectGpsLocation}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
      />
      <AudioCenterBox
        notifPermission={notifPermission}
        onRequestNotif={() => {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            void Notification.requestPermission().then(setNotifPermission);
          }
        }}
        adhanReciter={adhanReciter}
        setAdhanReciter={setAdhanReciter}
        playingAdhan={playingAdhan}
        volume={volume}
        setVolume={setVolume}
        onToggleAudio={() => {
          if (playingAdhan) {
            stopAdhanSound();
          } else {
            void playAdhanSound({ previewMode: true, reciterId: adhanReciter, volume });
          }
        }}
      />
    </div>
  );
};
