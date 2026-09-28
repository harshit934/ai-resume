export default function LoadingOverlay() {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-card">
        <div className="spinner" aria-hidden="true" />
        <p className="loading-title">Analyzing with Ollama</p>
        <p className="loading-sub">Matching skills, keywords, and experience…</p>
      </div>
    </div>
  );
}
