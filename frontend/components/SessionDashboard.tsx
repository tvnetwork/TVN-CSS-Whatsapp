'use client';

import Link from 'next/link';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { deleteSession, fetchSessionQr, fetchSessionStatus, type SessionResponse } from '../lib/api';

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
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      try {
        const [qrData, statusData] = await Promise.all([
          fetchSessionQr(sessionId),
          fetchSessionStatus(sessionId),
        ]);

        if (!active) {
          return;
        }

        const merged: SessionResponse = {
          ...statusData,
          qr: qrData.qr,
        };

        setSession(merged);
        setError(null);

        if (merged.qr) {
          const dataUrl = await QRCode.toDataURL(merged.qr, {
            margin: 1,
            width: 320,
          });

          if (active) {
            setQrImage(dataUrl);
          }
        } else if (active) {
          setQrImage(null);
        }
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
    }, 2000);

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
    <section className="panel stack">
      <div className="button-row">
        <Link className="button-secondary" href="/">
          Back Home
        </Link>
        <button className="button-danger" disabled={deleting} onClick={handleDelete} type="button">
          {deleting ? 'Deleting...' : 'Delete Session'}
        </button>
      </div>

      <div className="stack center-text">
        <p className="helper-text">Session Monitor</p>
        <h1 className="heading">{sessionId}</h1>
        <p className="subheading">
          QR code refreshes automatically every 2 seconds until the WhatsApp session is connected.
        </p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="center-text">
        <span className={statusClassName}>{session?.status || 'connecting'}</span>
      </div>

      <div className="qr-frame">
        {loading ? (
          <p className="helper-text">Loading QR code...</p>
        ) : qrImage ? (
          <img alt="WhatsApp session QR code" src={qrImage} />
        ) : (
          <p className="helper-text center-text">
            {session?.status === 'connected'
              ? 'Session connected successfully.'
              : 'Waiting for a fresh QR code from the backend.'}
          </p>
        )}
      </div>

      <div className="info-grid">
        <div className="info-card">
          <span className="label">Public Code</span>
          <p className="value">{session?.publicCode || 'Loading...'}</p>
        </div>
        <div className="info-card">
          <span className="label">Created At</span>
          <p className="value">{session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'Loading...'}</p>
        </div>
      </div>
    </section>
  );
}
