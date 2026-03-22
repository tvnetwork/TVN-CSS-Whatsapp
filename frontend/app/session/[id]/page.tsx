import { SessionDashboard } from '../../../components/SessionDashboard';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="page-shell">
      <SessionDashboard sessionId={id} />
    </main>
  );
}
