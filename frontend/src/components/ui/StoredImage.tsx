import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import api from '@/services/api';

/**
 * Show a stored photo, signature or receipt. Stored files are referenced as
 * "file:<id>" and need the user's sign-in, so they are fetched through the API;
 * older records may still hold a data URL, which is shown directly.
 */
export function useStoredFileUrl(value?: string | null) {
  const [url, setUrl] = useState<string | null>(value && !value.startsWith('file:') ? value : null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!value || !value.startsWith('file:')) {
      setUrl(value || null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    api.get(`/files/${value.slice(5)}`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        if (res.status >= 400 || !(res.data instanceof Blob)) throw new Error('not found');
        objectUrl = URL.createObjectURL(res.data);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [value]);
  return { url, failed };
}

export default function StoredImage({ value, alt, className, link }: { value?: string | null; alt: string; className?: string; link?: boolean }) {
  const { url, failed } = useStoredFileUrl(value);
  if (!value) return null;
  if (failed) return <span className="inline-flex items-center gap-1.5 text-xs text-gray-400"><ImageOff className="h-4 w-4" /> Image not available</span>;
  if (!url) return <span className={`block animate-pulse rounded-xl bg-gray-100 ${className || 'h-40'}`} />;
  const img = <img src={url} alt={alt} className={className} />;
  return link ? <a href={url} target="_blank" rel="noreferrer">{img}</a> : img;
}
