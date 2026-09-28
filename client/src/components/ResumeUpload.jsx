import { useRef } from "react";
import { apiUrl } from "../api.js";

export default function ResumeUpload({ onExtracted, onFileSelected, onRemove, fileName, preview, parsing, setParsing, setError }) {
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }
    console.info("[resume-upload] selected PDF:", file.name);
    onFileSelected(file);
    setError("");
    setParsing(true);
    try {
      const form = new FormData();
      form.append("resume", file);
      const parseUrl = apiUrl("/api/parse-pdf");
      console.info("[resume-upload] parse request started:", parseUrl);
      const res = await fetch(parseUrl, {
        method: "POST",
        body: form,
      });
      console.info("[resume-upload] parse response status:", res.status);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `PDF upload failed (HTTP ${res.status})`);
      }
      const text = typeof data?.text === "string" ? data.text : "";
      console.info("[resume-upload] parsed text length:", text.length);
      if (!text.trim()) {
        throw new Error("The server could not extract text from this PDF.");
      }
      const previewSlice = text.length > 600 ? `${text.slice(0, 600)}…` : text;
      onExtracted(text, previewSlice, file.name);
    } catch (e) {
      onExtracted("", "", file.name);
      setError(e instanceof TypeError
        ? "Could not reach the PDF parser. Check that the backend is running and try again."
        : e.message || "Could not read this PDF. Try another file.");
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
