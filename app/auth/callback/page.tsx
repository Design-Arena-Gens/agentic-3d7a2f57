"use client";
import { useEffect, useState } from 'react';
import { handleRedirectCallback } from '@/lib/oauth';

export default function CallbackPage() {
  const [message, setMessage] = useState('Completing sign-in...');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const err = url.searchParams.get('error');
        if (err) throw new Error(err);
        if (!code) throw new Error('Missing code');
        await handleRedirectCallback(code);
        setMessage('Signed in! Redirecting...');
        setTimeout(() => window.location.replace('/'), 800);
      } catch (e: any) {
        setError(e.message || 'Authentication failed');
        setMessage('');
      }
    })();
  }, []);

  return (
    <div className="card">
      {message && <div className="status">{message}</div>}
      {error && <div className="status error">{error}</div>}
    </div>
  );
}
