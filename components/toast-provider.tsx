'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#102039',
          color: '#e5eefc',
          border: '1px solid #24344d'
        }
      }}
    />
  );
}
