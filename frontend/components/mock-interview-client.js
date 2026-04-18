"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { SiteShell } from "./site-shell";

export function MockInterviewClient() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token || user?.role !== "student") {
      router.replace("/auth");
      return;
    }

    async function loadQuestions() {
      try {
        setLoading(true);
        setMessage("");
        const data = await authRequest("/ai/mock-interview", token);
        const nextQuestions = Array.isArray(data.questions)
          ? data.questions.slice(0, 3)
          : [];
        setQuestions(nextQuestions);
        setAiMessage(data.aiStatus?.message || "");
        setAnswers(["", "", ""]);
        setStep(0);
        setResult(null);
        if (!nextQuestions.length) {
          setMessage("No interview questions were returned. Please try again.");
        }
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
  }, [hydrated, token, user, router]);

  async function finishInterview() {
    setBusy(true);
    setMessage("");

    try {
      const data = await authRequest("/ai/mock-interview", token, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setResult(data.evaluation);
      setAiMessage(data.aiStatus?.message || "");
      setMessage(
        data.aiStatus?.mode === "fallback"
          ? "Interview feedback generated in demo fallback mode."
          : "Interview feedback is ready.",
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const canSubmitCurrentAnswer = Boolean(answers[step]?.trim());

  return (
    <SiteShell>
      <section className="grid two-up">
        <div className="content-card">
          <span className="eyebrow">AI Mock Interview</span>
          <h2>Practice 3 short questions</h2>
          <p>
            Answer role-based interview questions one by one. The feedback
            focuses on clarity, confidence, and how well you explain your
            thinking.
          </p>
          <br></br>
          {loading ? (
            <div className="loading-block">
              Generating interview questions...
            </div>
          ) : !questions.length ? (
            <div className="stack-form">
              <div className="inline-note">
                We could not load interview questions right now.
              </div>
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  setLoading(true);
                  setMessage("");
                  authRequest("/ai/mock-interview", token)
                    .then((data) => {
                      const nextQuestions = Array.isArray(data.questions)
                        ? data.questions.slice(0, 3)
                        : [];
                      setQuestions(nextQuestions);
                      setAnswers(["", "", ""]);
                      setStep(0);
                      setResult(null);
                      if (!nextQuestions.length) {
                        setMessage(
                          "No interview questions were returned. Please try again.",
                        );
                      }
                    })
                    .catch((error) => setMessage(error.message))
                    .finally(() => setLoading(false));
                }}
              >
                Load questions again
              </button>
            </div>
          ) : result ? (
            <div className="feature-grid">
              <article className="stat-card">
                <span>Communication: </span>
                <strong>{result.communicationScore}/100</strong>
              </article>
              <article className="stat-card">
                <span>Confidence: </span>
                <strong>{result.confidenceScore}/100</strong>
              </article>
              <article className="stat-card">
                <span>Technical clarity: </span>
                <strong>{result.technicalClarityScore}/100</strong>
              </article>
              <article className="proof-card full-span">
                <strong>Improvement tip</strong>
                <p>{result.improvementTip}</p>
              </article>
              <button
                type="button"
                className="button secondary full-span"
                onClick={() => {
                  setLoading(true);
                  setMessage("");
                  authRequest("/ai/mock-interview", token)
                    .then((data) => {
                      const nextQuestions = Array.isArray(data.questions)
                        ? data.questions.slice(0, 3)
                        : [];
                      setQuestions(nextQuestions);
                      setAnswers(["", "", ""]);
                      setStep(0);
                      setResult(null);
                    })
                    .catch((error) => setMessage(error.message))
                    .finally(() => setLoading(false));
                }}
              >
                Start another practice round
              </button>
            </div>
          ) : (
            <div className="stack-form">
              <article className="proof-card">
                <strong>Question {step + 1}</strong>
                <p>{questions[step]}</p>
              </article>
              <label>
                <span className="required-label">
                  Your response
                  <span className="required-mark">*</span>
                </span>
                <textarea
                  required
                  rows="7"
                  value={answers[step]}
                  onChange={(event) => {
                    const nextAnswers = [...answers];
                    nextAnswers[step] = event.target.value;
                    setAnswers(nextAnswers);
                  }}
                  placeholder="Type your answer here."
                />
              </label>
              <div className="action-row">
                {step > 0 ? (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setStep((current) => current - 1)}
                  >
                    Previous
                  </button>
                ) : null}
                {step < 2 ? (
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => setStep((current) => current + 1)}
                    disabled={!canSubmitCurrentAnswer}
                  >
                    Next question
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button primary"
                    onClick={finishInterview}
                    disabled={busy || !canSubmitCurrentAnswer}
                  >
                    {busy ? "Evaluating..." : "Finish interview"}
                  </button>
                )}
              </div>
            </div>
          )}
          {message ? <p className="status-banner">{message}</p> : null}
        </div>

        <div className="content-card accent-card">
          <span className="eyebrow">Interview flow</span>
          <h2>One question at a time</h2>
          <br></br>
          <div className="step-list">
            {(questions || []).map((question, index) => (
              <div
                key={`${question}-${index}`}
                className={
                  index === step ? "step-item active-step" : "step-item"
                }
              >
                <span className="step-index">{index + 1}</span>
                <p>{question}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
