import { useEffect, useRef, useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { LANGUAGES } from '@/i18n/translations';

/** Compact language picker for the header. */
export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === language)!;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
        title="Language"
      >
        <Languages className="h-4 w-4" />
        <span className="hidden sm:inline">{current.short}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-lift animate-pop-in">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-gray-50 ${
                lang.code === language ? 'font-semibold text-primary-700' : 'text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-6 text-[10px] font-bold text-gray-400">{lang.short}</span>
                {lang.label}
              </span>
              {lang.code === language && <Check className="h-4 w-4 text-primary-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
