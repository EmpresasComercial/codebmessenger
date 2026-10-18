export default function PageSkeleton() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f1f1f2', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <style>{`
        @keyframes __shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .ps { background: linear-gradient(90deg, #ebebeb 0%, #f5f5f5 40%, #ebebeb 100%); background-size: 200% 100%; animation: __shimmer 1s ease-in-out infinite; will-change: background-position; }
      `}</style>

      <div style={{ background: '#2481cc', height: 56, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12 }}>
        <div className="ps" style={{ width: 28, height: 28, borderRadius: '50%', opacity: 0.5 }} />
        <div className="ps" style={{ width: 140, height: 18, borderRadius: 4, opacity: 0.5 }} />
        <div style={{ flex: 1 }} />
        <div className="ps" style={{ width: 28, height: 28, borderRadius: '50%', opacity: 0.4 }} />
      </div>

      <div style={{ background: '#fff', padding: '8px 12px', borderBottom: '1px solid #ebeef2' }}>
        <div className="ps" style={{ width: '100%', height: 36, borderRadius: 4 }} />
      </div>

      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <div className="ps" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="ps" style={{ width: `${120 + (i % 3) * 30}px`, height: 14, borderRadius: 3 }} />
              <div className="ps" style={{ width: 36, height: 11, borderRadius: 3 }} />
            </div>
            <div className="ps" style={{ width: `${60 + (i % 4) * 40}%`, height: 12, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
