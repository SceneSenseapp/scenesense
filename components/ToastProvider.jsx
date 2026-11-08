// File: components/ToastProvider.jsx
"use client";

import { Toaster } from 'react-hot-toast';

/**
 * Global toast outlet. `react-hot-toast` only renders notifications when a
 * <Toaster /> is mounted, so this lives once in the root layout.
 */
export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      gutter={10}
      toastOptions={{
        duration: 3500,
        style: {
          background: '#080d1a',
          color: '#e0f2fe',
          border: '1px solid rgba(6, 182, 212, 0.35)',
          borderRadius: '14px',
          fontSize: '12px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.8)',
        },
        success: { iconTheme: { primary: '#22d3ee', secondary: '#050508' } },
        error: { iconTheme: { primary: '#f43f5e', secondary: '#050508' } },
      }}
    />
  );
}
