'use client';

import Link from 'next/link';
import { useState } from 'react';

import { createSession, type CreateSessionResponse } from '../lib/api';

export function CreateSessionCard() {
  const [session, setSession] = useState<CreateSessionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      const nextSession = await createSession();
      setSession(nextSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel stack">
      <div className="stack">
        <p className="helper-text">TVN System</p>
        <h1 className="heading">Multi-session WhatsApp automation made deployment ready.</h1>
        <p className="subheading">
          Create a session, scan the WhatsApp QR code, and monitor connection status from a
          mobile-friendly control panel.
        </p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="button-row">
        <button className="button" disabled={loading} onClick={handleCreate} type="button">
          {loading ? 'Creating Session...' : 'Create Session'}
        </button>
        {session ? (
          <Link className="button-secondary" href={`/session/${session.sessionId}`}>
            Open Session
          </Link>
        ) : null}
      </div>

      {session ? (
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
      ) : null}
    </section>
  );
}
