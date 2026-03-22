'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { createPairSession, fetchSessionStatus, type PairSessionResponse, type SessionResponse } from '../lib/api';

const getStatusLabel = (status: SessionResponse['status'], loading: boolean, hasSession: boolean): string => {
  if (loading) {
    return 'Generating...';
  }

  if (!hasSession) {
    return 'Idle';
  }

  if (status === 'connected') {
    return 'Connected ✅';
  }

  if (status === 'disconnected') {
    return 'Failed to connect to server';
  }

  return 'Waiting for connection...';
};

export function CreateSessionCard() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [session, setSession] = useState<PairSessionResponse | null>(null);
  const [status, setStatus] = useState<SessionResponse['status']>('connecting');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (!session?.sessionId) {
      return;
    }

    let active = true;

    const pollStatus = async () => {
      try {
        const response = await fetchSessionStatus(session.sessionId);
        if (active) {
          setStatus(response.status);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        if (active) {
          setError('Failed to connect to server');
          setStatus('disconnected');
        }
      }
    };

    void pollStatus();
    const timer = window.setInterval(() => {
      void pollStatus();
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [session?.sessionId]);

  const statusLabel = useMemo(() => {
    return getStatusLabel(status, loading, Boolean(session));
  }, [loading, session, status]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      setCopyState('idle');
      const result = await createPairSession(phoneNumber.replace(/\D/g, ''));
      setSession(result);
      setStatus('connecting');
    } catch (err) {
      console.error('Fetch error:', err);
      setSession(null);
      setStatus('disconnected');
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

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
        <header className="space-y-3 text-center">
          <p className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
            TVN System
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">TVN WhatsApp Pairing</h1>
            <p className="text-sm text-slate-300 sm:text-base">Connect your WhatsApp instantly</p>
          </div>
        </header>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-200" htmlFor="phone-number">
            Phone Number
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-base text-white outline-none transition duration-200 placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20"
              id="phone-number"
              inputMode="numeric"
              onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ''))}
              placeholder="2348012345678"
              type="text"
              value={phoneNumber}
            />
            <button
              className="h-14 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 text-sm font-semibold text-slate-950 transition duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading || phoneNumber.trim().length === 0}
              onClick={handleGenerate}
              type="button"
            >
              {loading ? 'Generating...' : 'Generate Pair Code'}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 text-center transition duration-300">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Status</p>
          <p className="mt-3 text-lg font-semibold text-white">{statusLabel}</p>
        </div>

        {error ? <p className="text-center text-sm font-medium text-red-300">{error}</p> : null}

        {session ? (
          <div className="space-y-6 rounded-3xl border border-cyan-300/20 bg-slate-950/50 p-5 transition duration-300">
            <div className="space-y-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Pairing Code</p>
              <p className="text-4xl font-black tracking-[0.35em] text-white sm:text-5xl">
                {session.pairingCode}
              </p>
              <button
                className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-white/20"
                onClick={handleCopy}
                type="button"
              >
                {copyState === 'copied' ? 'Copied!' : 'Copy Code'}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Session ID</p>
                <p className="mt-2 break-all text-sm font-medium text-white">{session.sessionId}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Public Code</p>
                <p className="mt-2 break-all text-sm font-medium text-white">{session.publicCode}</p>
              </div>
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

            <div className="flex justify-center">
              <Link
                className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-white/20"
                href={`/session/${session.sessionId}`}
              >
                Open Live Status
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
