'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { createPairSession, fetchSessionStatus, type PairSessionResponse, type SessionResponse } from '../lib/api';

const statusClassMap: Record<SessionResponse['status'], string> = {
  connecting: 'status-pill status-connecting',
  connected: 'status-pill status-connected',
  disconnected: 'status-pill status-disconnected',
};

export function CreateSessionCard() {
  const [number, setNumber] = useState('+2348012345678');
  const [session, setSession] = useState<PairSessionResponse | null>(null);
  const [status, setStatus] = useState<SessionResponse['status']>('connecting');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.sessionId) {
      return;
    }

    let active = true;

    const syncStatus = async () => {
      try {
        const nextStatus = await fetchSessionStatus(session.sessionId);
        if (active) {
          setStatus(nextStatus.status);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to fetch session status');
        }
      }
    };

    void syncStatus();
    const interval = window.setInterval(() => {
      void syncStatus();
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [session?.sessionId]);

  const statusClassName = useMemo(() => {
    return statusClassMap[status];
  }, [status]);

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus('connecting');
      const nextSession = await createPairSession(number);
      setSession(nextSession);
    } catch (err) {
      setSession(null);
      setError(err instanceof Error ? err.message : 'Unable to generate pairing code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel stack panel-lg">
      <div className="hero-stack">
        <div className="badge-row">
          <span className="hero-badge">TVN System</span>
          <span className="hero-badge hero-badge-secondary">Pairing Code Mode</span>
        </div>
        <h1 className="heading">Instant WhatsApp pairing codes for the TVN automation system.</h1>
        <p className="subheading">
          Enter a phone number with country code, generate a pairing code instantly, and watch the
          connection status update live from a Vercel-safe dashboard.
        </p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="stack form-stack">
        <label className="field-label" htmlFor="phone-number">
          Phone Number
        </label>
        <div className="input-row">
          <input
            autoComplete="tel"
            className="input"
            id="phone-number"
            inputMode="tel"
            onChange={(event) => setNumber(event.target.value)}
            placeholder="+2348012345678"
            type="tel"
            value={number}
          />
          <button className="button" disabled={loading} onClick={handleCreate} type="button">
            {loading ? 'Generating...' : 'Generate Pair Code'}
          </button>
        </div>
      </div>

      <div className="info-card info-card-highlight center-text stack">
        <span className="label">Instructions</span>
        <p className="instruction-text">Go to WhatsApp → Linked Devices → Enter Code</p>
        <div className="center-text">
          <span className={statusClassName}>
            {status === 'connected' ? 'Connected ✅' : status === 'disconnected' ? 'Disconnected' : 'Connecting...'}
          </span>
        </div>
      </div>

      {session ? (
        <div className="stack result-stack">
          <div className="pair-code-card center-text">
            <span className="label">Pairing Code</span>
            <p className="pair-code-value">{session.pairingCode}</p>
          </div>

          <div className="info-grid">
            <div className="info-card">
              <span className="label">Session ID</span>
              <p className="value">{session.sessionId}</p>
            </div>
            <div className="info-card">
              <span className="label">Public Code</span>
              <p className="value">{session.publicCode}</p>
            </div>
          </div>

          <div className="button-row">
            <Link className="button-secondary" href={`/session/${session.sessionId}`}>
              Open Live Session
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
