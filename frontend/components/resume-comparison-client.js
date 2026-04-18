"use client";

import { CheckCircle2, FileText, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest } from "@/lib/api";
import { downloadResumeFromDataUrl } from "@/lib/resume-download";
import { useAuth } from "./auth-provider";
import { SiteShell } from "./site-shell";

export function ResumeComparisonClient() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const [resumeFile, setResumeFile] = useState(null);
  const [savedResume, setSavedResume] = useState(null);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && (!token || user?.role !== "student")) {
      router.replace("/auth");
    }
  }, [hydrated, token, user, router]);

  useEffect(() => {
    if (!hydrated || !token || user?.role !== "student") {
      return;
    }

    async function loadProfileResume() {
      try {
        const data = await authRequest("/students/profile", token);
        const uploadedResume = data.profile?.uploadedResume?.fileName
          ? data.profile.uploadedResume
          : null;
        setSavedResume(uploadedResume);
      } catch {
        setSavedResume(null);
      }
    }

    loadProfileResume();
  }, [hydrated, token, user]);

  if (!hydrated) {
    return null;
  }

  async function handleCompare(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const payload = new FormData();
      if (resumeFile) {
        payload.append("resumeFile", resumeFile);
      }

      const data = await authRequest("/ai/resume-comparison", token, {
        method: "POST",
        body: payload,
      });

      setResult(data);
      if (data.uploadedResume?.fileName) {
        setSavedResume(data.uploadedResume);
      }
      setMessage("ATS resume check ready.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSavedResumeDownload() {
    try {
      setMessage("");
      const data = await authRequest("/ai/resume-file", token);
      downloadResumeFromDataUrl({
        dataUrl: data.dataUrl,
        fileName: data.fileName,
      });
    } catch (error) {
      setMessage(error.message);
    }
  }

  const atsScore = Number(result?.atsScore || 0);
  const circleDegrees = Math.max(0, Math.min(360, (atsScore / 100) * 360));

  return (
    <SiteShell>
      <section className="grid two-up">
        <div className="content-card">
          <span className="eyebrow">ATS Resume Check</span>
          <h2>Check how ATS-friendly your resume is</h2>
          <p>
            Use your saved onboarding resume or upload a fresh PDF to see how
            well it fits ATS-friendly structure, keyword coverage, and resume
            quality.
          </p>
          <br></br>
          <form className="stack-form" onSubmit={handleCompare}>
            <article className="proof-card upload-card">
              <div className="proof-head">
                <strong>
                  {savedResume?.fileName
                    ? "Saved onboarding resume"
                    : "Upload resume PDF"}
                </strong>
                <span className="badge subtle">
                  <Upload size={14} />
                  PDF only
                </span>
              </div>
              {savedResume?.fileName ? (
                <>
                  <p className="muted">
                    Using saved resume: <strong>{savedResume.fileName}</strong>
                    {resumeFile
                      ? " with a one-time PDF override selected below."
                      : "."}
                  </p>
                  <br></br>
                  <div className="file-upload-actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={handleSavedResumeDownload}
                    >
                      View or download saved resume
                    </button>
                  </div>
                </>
              ) : null}
              <br></br>
              <label className="file-upload">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (file && file.type !== "application/pdf") {
                      setResumeFile(null);
                      setMessage("Only PDF resumes are supported for upload.");
                      event.target.value = "";
                      return;
                    }
                    setResumeFile(file);
                    setMessage("");
                  }}
                />
                <span>
                  {resumeFile
                    ? resumeFile.name
                    : savedResume?.fileName
                      ? "Choose a PDF only if you want to override your saved onboarding resume for this ATS check."
                      : "Choose a PDF resume to extract text automatically."}
                </span>
              </label>
            </article>
            <button
              className="button primary"
              disabled={busy || (!resumeFile && !savedResume?.fileName)}
            >
              {busy ? "Checking..." : "Run ATS resume check"}
            </button>
          </form>
          {message ? <p className="status-banner">{message}</p> : null}
        </div>

        <div className="content-card accent-card">
          <span className="eyebrow">ATS result</span>
          <h2>Resume readiness report</h2>
          {result ? (
            <div className="feature-grid">
              <article className="proof-card">
                <div className="ats-score-card">
                  <div
                    className="ats-score-ring"
                    style={{
                      background: `conic-gradient(var(--primary) ${circleDegrees}deg, rgba(23, 107, 135, 0.12) ${circleDegrees}deg)`,
                    }}
                  >
                    <div className="ats-score-inner">
                      <strong>{atsScore}</strong>
                      <span>/100</span>
                    </div>
                  </div>
                  <div className="ats-score-copy">
                    <strong>ATS friendly score</strong>
                    <p>
                      This score reflects keyword match, section structure,
                      formatting safety, and resume content strength.
                    </p>
                  </div>
                </div>
              </article>
              <article className="proof-card">
                <strong>Score breakdown</strong>
                <div className="ats-breakdown-list">
                  {(result.scoreBreakdown || []).map((item) => (
                    <div key={item.label} className="ats-breakdown-row">
                      <span>{item.label}</span>
                      <strong>{item.score}/100</strong>
                    </div>
                  ))}
                </div>
              </article>
              <article className="proof-card">
                <strong>ATS strengths</strong>
                <div className="ats-check-list">
                  {(result.atsStrengths || []).map((item) => (
                    <p key={item}>
                      <CheckCircle2 size={15} />
                      <span>{item}</span>
                    </p>
                  ))}
                </div>
              </article>
              <article className="proof-card">
                <strong>Areas to improve</strong>
                <div className="ats-check-list warning">
                  {(result.atsSuggestions || []).map((item) => (
                    <p key={item}>
                      <FileText size={15} />
                      <span>{item}</span>
                    </p>
                  ))}
                </div>
              </article>
              <article className="proof-card">
                <strong>Section checks</strong>
                <div className="ats-breakdown-list">
                  {(result.sectionChecks || []).map((item) => (
                    <div key={item.label} className="ats-breakdown-row">
                      <span>{item.label}</span>
                      <strong>{item.present ? "Found" : "Missing"}</strong>
                    </div>
                  ))}
                </div>
              </article>
              <article className="proof-card">
                <strong>Keyword match</strong>
                <div className="skill-badges">
                  {(result.keywordCoverage?.matched || []).map((item) => (
                    <span key={item} className="badge">
                      {item}
                    </span>
                  ))}
                  {!(result.keywordCoverage?.matched || []).length ? (
                    <span className="badge subtle">No strong matches yet</span>
                  ) : null}
                </div>
              </article>
              <article className="proof-card full-span">
                <strong>ATS summary</strong>
                <p>{result.atsSummary}</p>
                <p>{result.mismatchSummary}</p>
                <p className="muted">
                  Profile skill score: {result.profileSkillScore || 0}/100
                </p>
              </article>
              <article className="proof-card">
                <strong>Claimed skills</strong>
                <div className="skill-badges">
                  {(result.claimedSkills || []).map((item) => (
                    <span key={item} className="badge">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
              <article className="proof-card">
                <strong>Verified skills</strong>
                <div className="skill-badges">
                  {(result.verifiedSkills || []).map((item) => (
                    <span key={item} className="badge">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          ) : (
            <p className="muted">
              Use your saved onboarding resume or upload a PDF to generate your
              ATS score, improvement suggestions, and resume-readiness
              breakdown.
            </p>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
