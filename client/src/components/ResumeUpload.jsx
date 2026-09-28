import { useRef } from "react";
import { apiUrl } from "../api.js";

export default function ResumeUpload({ onExtracted, onRemove, fileName, preview, parsing, setParsing, setError }) {
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    setParsing(true);
    try {
      const form = new FormData();
      form.append("resume", file);
      const res = await fetch(apiUrl("/api/parse-pdf"), {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse PDF");
      }
      const text = data.text;
      const previewSlice = text.length > 600 ? `${text.slice(0, 600)}…` : text;
      onExtracted(text, previewSlice, file.name);
    } catch (e) {
      setError(e.message || "Could not read PDF");
      onExtracted("", "");
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <article className="card">
      <div className="card-heading-row">
        <div>
          <p className="section-kicker">STEP 01</p>
          <h2 className="card-title">Upload your resume</h2>
        </div>
        <span className="field-badge">PDF · 10 MB max</span>
      </div>
      <p className="card-desc">Add a text-based PDF to compare your experience with the role.</p>

      <label
        className={`dropzone ${fileName ? "has-file" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("drag-over");
        }}
        onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onChange}
          disabled={parsing}
          className="sr-only"
        />
        <span className="upload-icon" aria-hidden="true">↑</span>
        <span className="dropzone-text">
          {parsing ? "Extracting text…" : fileName ? "Replace resume" : "Drop your resume here"}
        </span>
        <span className="dropzone-hint">Browse files or drag and drop · PDF only</span>
      </label>

      {fileName && !parsing && (
        <div className="selected-file">
          <span className="file-icon" aria-hidden="true">PDF</span>
          <span className="selected-file-name" title={fileName}>{fileName}</span>
          <button type="button" className="remove-file" onClick={onRemove} aria-label={`Remove ${fileName}`}>
            Remove
          </button>
        </div>
      )}

      {preview && (
        <div className="preview-block fade-in">
          <h3 className="preview-label">Extracted preview</h3>
          <pre className="preview-text">{preview}</pre>
        </div>
      )}
    </article>
  );
}
