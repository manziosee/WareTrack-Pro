import { useQuery } from '@tanstack/react-query';
import { Cloud, CloudRain, CloudSun, Sun, CloudLightning, CloudFog, CloudDrizzle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';

// Kigali
const LAT = -1.9441;
const LON = 30.0619;

function weatherIcon(code: number) {
  if (code === 0) return { Icon: Sun, label: 'Clear' };
  if (code <= 2) return { Icon: CloudSun, label: 'Partly cloudy' };
  if (code === 3) return { Icon: Cloud, label: 'Cloudy' };
  if (code <= 48) return { Icon: CloudFog, label: 'Fog' };
  if (code <= 57) return { Icon: CloudDrizzle, label: 'Drizzle' };
  if (code <= 82) return { Icon: CloudRain, label: 'Rain' };
  return { Icon: CloudLightning, label: 'Thunderstorms' };
}

/** Current Kigali weather from Open-Meteo (free, no key). Hidden if unavailable. */
function Weather() {
  const { data } = useQuery({
    queryKey: ['weather', 'kigali'],
    queryFn: async () => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,precipitation_probability&timezone=Africa%2FKigali`
      );
      if (!res.ok) throw new Error('weather unavailable');
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
    retry: false,
  });
  if (!data?.current) return null;
  const { Icon, label } = weatherIcon(data.current.weather_code);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-100">
      <Icon className="h-3.5 w-3.5 text-accent-500" />
      Kigali {Math.round(data.current.temperature_2m)}°C · {label}
    </span>
  );
}

interface GreetingProps {
  summary?: ReactNode;
  actions?: ReactNode;
}

/** "Good morning, Manzi" header with today's date, live weather and a short summary. */
export default function Greeting({ summary, actions }: GreetingProps) {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('Good morning') : hour < 17 ? t('Good afternoon') : t('Good evening');
  const firstName = (user?.name || '').split(' ')[0];
  const locale = language === 'fr' ? 'fr-FR' : language === 'rw' ? 'rw-RW' : 'en-GB';
  let date: string;
  try {
    date = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="font-medium capitalize">{date}</span>
          <Weather />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {greeting}, {firstName} <span className="inline-block origin-[70%_70%] animate-[wave_2s_ease-in-out_1]">👋</span>
        </h1>
        {summary && <p className="mt-0.5 text-sm text-gray-500">{summary}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
