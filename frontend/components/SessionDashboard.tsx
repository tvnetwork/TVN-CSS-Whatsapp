'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { fetchSession, fetchSessionStatus, type SessionResponse } from '../lib/api';

const getStatusLabel = (status: SessionResponse['status'], loading: boolean): string => {
  if (loading) {
    return 'Generating...';
  }

  if (status === 'connected') {
    return 'Connected ✅';
  }

  if (status === 'disconnected') {
    return 'Failed to connect to server';
  }

  return 'Waiting for connection...';
};

export function SessionDashboard({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [status, setStatus] = useState<SessionResponse['status']>('connecting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      try {
        const [details, statusResponse] = await Promise.all([
          fetchSession(sessionId),
          fetchSessionStatus(sessionId),
        ]);

        if (!active) {
          return;
        }

        setSession({
          ...details,
          status: statusResponse.status,
        });
        setStatus(statusResponse.status);
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        if (active) {
          setError('Failed to connect to server');
          setStatus('disconnected');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void syncSession();
    const timer = window.setInterval(() => {
      void syncSession();
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [sessionId]);

  const statusLabel = useMemo(() => {
    return getStatusLabel(status, loading);
  }, [loading, status]);

  const handleCopy = async () => {
    if (!session?.pairingCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(session.pairingCode);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to connect to server');
    }
  };

  return (
    <section className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-xl transition-all duration-300 sm:p-8">
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-white/20"
            href="/"
          >
            Back
          </Link>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
            Live Pairing
          </span>
        </div>

        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">TVN WhatsApp Pairing</h1>
          <p className="text-sm text-slate-300 sm:text-base">Connect your WhatsApp instantly</p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Status</p>
          <p className="mt-3 text-lg font-semibold text-white">{statusLabel}</p>
        </div>

        {error ? <p className="text-center text-sm font-medium text-red-300">{error}</p> : null}

        <div className="space-y-6 rounded-3xl border border-cyan-300/20 bg-slate-950/50 p-5">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Pairing Code</p>
            <p className="text-4xl font-black tracking-[0.35em] text-white sm:text-5xl">
              {session?.pairingCode || '---- ----'}
            </p>
            <button
              className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-white/20"
              onClick={handleCopy}
              type="button"
            >
              {copyState === 'copied' ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Instructions</p>
            <ol className="mt-3 space-y-2 text-sm text-slate-200">
              <li>1. Open WhatsApp</li>
              <li>2. Linked Devices</li>
              <li>3. Link with code</li>
              <li>4. Enter code</li>
            </ol>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Session ID</p>
              <p className="mt-2 break-all text-sm font-medium text-white">{session?.sessionId || sessionId}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Public Code</p>
              <p className="mt-2 break-all text-sm font-medium text-white">{session?.publicCode || 'Loading...'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
