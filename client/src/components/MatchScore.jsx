export default function MatchScore({ percentage }) {
  const score = Math.min(100, Math.max(0, Number(percentage) || 0));
  const ringStyle = {
    background: `conic-gradient(var(--accent) ${score * 3.6}deg, var(--surface-3) 0deg)`,
  };

  let label = "Needs work";
  if (score >= 80) label = "Strong match";
  else if (score >= 60) label = "Good match";
  else if (score >= 40) label = "Moderate match";

  return (
    <article className="card score-card">
      <h3 className="card-title">Match score</h3>
      <div className="score-ring-wrap">
        <div className="score-ring" style={ringStyle}>
          <div className="score-ring-inner">
            <span className="score-value">{score}</span>
            <span className="score-unit">%</span>
          </div>
        </div>
        <p className="score-label">{label}</p>
      </div>
    </article>
  );
}
