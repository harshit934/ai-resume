export default function JobDescription({ value, onChange }) {
  return (
    <article className="card">
      <div className="card-heading-row">
        <div>
          <p className="section-kicker">STEP 02</p>
          <h2 className="card-title">Add the target role</h2>
        </div>
        <span className="field-badge">Required</span>
      </div>
      <p className="card-desc">Paste the full posting to compare skills, experience, and ATS keywords.</p>
      <textarea
        className="job-textarea"
        aria-label="Job description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the role title, requirements, responsibilities, and qualifications…"
        rows={14}
        spellCheck
      />
      <p className="char-count">{value.length.toLocaleString()} characters</p>
    </article>
  );
}
