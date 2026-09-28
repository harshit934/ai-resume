import MatchScore from "./MatchScore.jsx";
import TagListCard from "./TagListCard.jsx";
import BulletCard from "./BulletCard.jsx";

import { useState } from "react";

export default function ResultsDashboard({ data, onAnalyzeAnother }) {
  const [copied, setCopied] = useState(false);
  const copySummary = async () => {
    if (!data.professionalSummary) return;
    await navigator.clipboard.writeText(data.professionalSummary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="results fade-in" aria-label="Analysis results">
      <div className="results-topline">
        <div>
          <p className="eyebrow accent-text">ANALYSIS COMPLETE</p>
          <h2 className="results-heading">Your analysis</h2>
          <p className="results-subtitle">A role-specific view of your resume match, experience, and ATS keywords.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={onAnalyzeAnother}>
          <span aria-hidden="true">↺</span> Analyze another resume
        </button>
      </div>

      <article className="card summary-card">
        <div className="summary-heading">
          <div>
            <p className="section-kicker">AI GENERATED</p>
            <h3 className="card-title">Professional summary</h3>
          </div>
          <button
            type="button"
            className="copy-button"
            onClick={copySummary}
            disabled={!data.professionalSummary}
          >
            {copied ? "Copied" : "Copy summary"}
          </button>
        </div>
        <p className={`summary-text ${data.professionalSummary ? "" : "empty-msg"}`}>
          {data.professionalSummary || "No professional summary was returned for this analysis."}
        </p>
      </article>

      <div className="results-grid">
        <MatchScore percentage={data.matchPercentage} />

        <TagListCard title="Matching skills" items={data.matchingSkills} variant="success" empty="No clear skill overlaps detected." />

        <TagListCard title="Missing skills" items={data.missingSkills} variant="warn" empty="No major gaps flagged." />

        <TagListCard
          title="ATS keyword analysis"
          items={data.keywordsFound}
          missingItems={data.keywordsMissing}
          variant="neutral"
          empty="No shared ATS keywords identified."
        />

        <BulletCard title="Experience match" items={data.relevantExperience} empty="No directly relevant experience highlighted." />

        <BulletCard title="Relevant projects" items={data.relevantProjects} empty="No matching projects highlighted." />

        <BulletCard
          title="AI recommendations"
          items={data.improvementSuggestions}
          empty="No suggestions returned."
          className="span-full"
        />
      </div>
    </section>
  );
}
