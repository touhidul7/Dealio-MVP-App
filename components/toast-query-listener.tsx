'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

export function ToastQueryListener() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const type = searchParams.get('toast');
    const message = searchParams.get('message');
    if (!type || !message) return;

    if (type === 'error') toast.error(message);
    else toast.success(message);

    const url = new URL(window.location.href);
    url.searchParams.delete('toast');
    url.searchParams.delete('message');
    window.history.replaceState({}, '', url.toString());
  }, [searchParams]);

  return null;
}
