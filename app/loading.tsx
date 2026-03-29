export default function Loading() {
  return (
    <main className="container" style={{ paddingTop: 40 }}>
      <div className="card grid" style={{ gap: 12 }}>
        <div className="muted">Loading page...</div>
        <div style={{ height: 12, borderRadius: 999, background: '#102039' }} />
        <div style={{ height: 12, borderRadius: 999, background: '#102039', width: '85%' }} />
        <div style={{ height: 12, borderRadius: 999, background: '#102039', width: '70%' }} />
      </div>
    </main>
  );
}

