import { SessionDashboard } from '../../../components/SessionDashboard';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-hero-gradient px-4 py-10">
      <SessionDashboard sessionId={id} />
    </main>
  );
}
