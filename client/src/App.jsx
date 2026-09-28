import { useState, useCallback, useEffect } from "react";
import { apiUrl } from "./api.js";
import ResumeUpload from "./components/ResumeUpload.jsx";
import JobDescription from "./components/JobDescription.jsx";
import LoadingOverlay from "./components/LoadingOverlay.jsx";
import ResultsDashboard from "./components/ResultsDashboard.jsx";

export default function App() {
  const [resumeText, setResumeText] = useState("");
  const [resumePreview, setResumePreview] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    console.info("[resume-state] resumeText updated; length:", resumeText.length);
  }, [resumeText]);

  const handleResumeExtracted = useCallback((text, preview, fileName = "") => {
    console.info("[resume-state] parsed text received; length:", text.length);
    setResumeText(text);
    setResumePreview(preview);
    setResumeFileName(fileName);
    setAnalysis(null);
    setError("");
  }, []);

  const handleRemoveResume = () => {
    setResumeText("");
    setResumePreview("");
    setResumeFile(null);
    setResumeFileName("");
    setAnalysis(null);
    setError("");
  };

  const handleStartOver = () => {
    handleRemoveResume();
    setJobDescription("");
  };

  const handleAnalyze = async () => {
    setError("");
    setAnalysis(null);

    if (!resumeText.trim()) {
      setError("Upload a PDF resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Paste a job description before analyzing.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeText.trim(),
          jobDescription: jobDescription.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }
      setAnalysis(data);
    } catch (e) {
      setError(e.message || "Something went wrong. Check that the server and Ollama are running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-mark" aria-hidden="true"><span>✦</span></span>
            <div>
              <p className="eyebrow">PRIVATE AI WORKSPACE</p>
              <h1>AI Resume Analyzer</h1>
            </div>
          </div>
          <div className="header-status"><span className="status-dot" /> Runs locally with Ollama</div>
        </div>
      </header>

      <main className="main">
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {!analysis && <section className="hero-copy">
          <p className="eyebrow accent-text">RESUME INTELLIGENCE <span className="hero-spark">/</span> ROLE MATCHING</p>
          <h2>AI Resume Analyzer</h2>
          <p>See how your experience aligns with a role. Get a clear match analysis, ATS keywords, and practical ways to strengthen your application.</p>
        </section>}

        {!analysis && <section className="input-grid">
          <ResumeUpload
            onExtracted={handleResumeExtracted}
            onFileSelected={setResumeFile}
            onRemove={handleRemoveResume}
            fileName={resumeFileName}
            preview={resumePreview}
            parsing={parsingPdf}
            setParsing={setParsingPdf}
            setError={setError}
          />
          <JobDescription value={jobDescription} onChange={setJobDescription} />
        </section>}

        {!analysis && <div className="actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleAnalyze}
            disabled={loading || parsingPdf}
          >
            {loading ? "Analyzing resume…" : <><span>Analyze Resume</span><span aria-hidden="true">↗</span></>}
          </button>
          <span className="action-note"><span className="privacy-icon" aria-hidden="true">◈</span> Your resume stays on this machine</span>
        </div>}

        {analysis && <ResultsDashboard data={analysis} onAnalyzeAnother={handleStartOver} />}
      </main>

      <footer className="footer">
        <p><span className="footer-mark">✦</span> Private by design · Powered by local Ollama</p>
      </footer>

      {loading && <LoadingOverlay />}
    </div>
  );
}
