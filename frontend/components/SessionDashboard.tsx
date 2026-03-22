'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { deleteSession, fetchSession, fetchSessionStatus, type SessionResponse } from '../lib/api';

interface SessionDashboardProps {
  sessionId: string;
}

const statusClassMap: Record<SessionResponse['status'], string> = {
  connecting: 'status-pill status-connecting',
  connected: 'status-pill status-connected',
  disconnected: 'status-pill status-disconnected',
};

export function SessionDashboard({ sessionId }: SessionDashboardProps) {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      try {
        const [details, status] = await Promise.all([
          fetchSession(sessionId),
          fetchSessionStatus(sessionId),
        ]);

        if (!active) {
          return;
        }

        setSession({
          ...details,
          status: status.status,
        });
        setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load session');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void syncSession();
    const interval = window.setInterval(() => {
      void syncSession();
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [sessionId]);

  const statusClassName = useMemo(() => {
    return session ? statusClassMap[session.status] : statusClassMap.connecting;
  }, [session]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      await deleteSession(sessionId);
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete session');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="panel stack panel-lg">
      <div className="button-row button-row-spread">
        <Link className="button-secondary" href="/">
          Back Home
        </Link>
        <button className="button-danger" disabled={deleting} onClick={handleDelete} type="button">
          {deleting ? 'Deleting...' : 'Delete Session'}
        </button>
      </div>

      <div className="stack center-text">
        <p className="helper-text">Live Session Monitor</p>
        <h1 className="heading">{session?.publicCode || sessionId}</h1>
        <p className="subheading">
          Enter the pairing code below inside WhatsApp Linked Devices. Status updates every 2.5 seconds.
        </p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="info-card info-card-highlight center-text stack">
        <span className="label">Connection Status</span>
        <div>
          <span className={statusClassName}>
            {session?.status === 'connected'
              ? 'Connected ✅'
              : session?.status === 'disconnected'
                ? 'Disconnected'
                : 'Connecting...'}
          </span>
        </div>
        <p className="instruction-text">Go to WhatsApp → Linked Devices → Enter Code</p>
      </div>

      <div className="pair-code-card center-text">
        <span className="label">Pairing Code</span>
        <p className="pair-code-value">{loading ? 'Loading...' : session?.pairingCode || 'Pending...'}</p>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="label">Session ID</span>
          <p className="value">{session?.sessionId || sessionId}</p>
        </div>
        <div className="info-card">
          <span className="label">Public Code</span>
          <p className="value">{session?.publicCode || 'Loading...'}</p>
        </div>
        <div className="info-card">
          <span className="label">Phone Number</span>
          <p className="value">{session?.phoneNumber || 'Loading...'}</p>
        </div>
        <div className="info-card">
          <span className="label">Created At</span>
          <p className="value">{session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'Loading...'}</p>
        </div>
      </div>
    </section>
  );
}
