"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { SiteShell } from "./site-shell";

const initialTask = {
  skillCategory: "",
  taskPrompt: "",
  userSubmission: "",
};

export function TaskSubmissionClient() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const [form, setForm] = useState(initialTask);
  const [suggestedSkills, setSuggestedSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState("");
  const [message, setMessage] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token || user?.role !== "student") {
      router.replace("/auth");
      return;
    }

    async function loadTaskPrompt(selectedSkill = "") {
      try {
        setLoadingPrompt(true);
        const query = selectedSkill
          ? `?skill=${encodeURIComponent(selectedSkill)}`
          : "";
        const data = await authRequest(`/ai/skill-task-prompts${query}`, token);
        setSuggestedSkills(data.suggestedSkills || []);
        if (data.aiStatus?.message) {
          setAiMessage(data.aiStatus.message);
        }
        setForm((current) => {
          const nextSkill = data.selectedSkill || current.skillCategory || "";
          return {
            ...current,
            skillCategory: nextSkill,
            taskPrompt: data.task?.taskPrompt || "",
          };
        });
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoadingPrompt(false);
        setLoading(false);
      }
    }

    loadTaskPrompt();
  }, [hydrated, token, user, router]);

  async function refreshTaskPrompt(skillName) {
    const normalizedSkill = String(skillName || "").trim();
    if (!normalizedSkill) {
      setForm((current) => ({
        ...current,
        skillCategory: "",
        taskPrompt: "",
      }));
      return;
    }

    setMessage("");
    await (async () => {
      try {
        setLoadingPrompt(true);
        const data = await authRequest(
          `/ai/skill-task-prompts?skill=${encodeURIComponent(normalizedSkill)}`,
          token,
        );
        setSuggestedSkills(data.suggestedSkills || []);
        if (data.aiStatus?.message) {
          setAiMessage(data.aiStatus.message);
        }
        setForm((current) => ({
          ...current,
          skillCategory: data.selectedSkill || normalizedSkill,
          taskPrompt: data.task?.taskPrompt || "",
        }));
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoadingPrompt(false);
      }
    })();
  }

  function addCustomSkill() {
    const normalizedSkill = customSkill.trim();
    if (!normalizedSkill) {
      return;
    }

    setCustomSkill("");
    refreshTaskPrompt(normalizedSkill);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const data = await authRequest("/ai/skill-task", token, {
        method: "POST",
        body: JSON.stringify(form),
      });

      setResult(data.submission);
      setAiMessage(data.aiStatus?.message || "");
      setMessage(
        data.aiStatus?.mode === "fallback"
          ? "Task scored in demo fallback mode."
          : "Task submitted and scored.",
      );
      setForm((current) => ({
        ...current,
        userSubmission: "",
      }));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const hasSelectedSkill = Boolean(form.skillCategory.trim());
  const hasTaskPrompt = Boolean(form.taskPrompt.trim());

  return (
    <SiteShell>
      <section className="grid two-up">
        <div className="content-card">
          <span className="eyebrow">Skill Proof System</span>
          <h2>Submit a short practical task</h2>
          <p>
            Choose a skill you want to prove, generate a task for that exact
            skill, answer the prompt, and receive a structured evaluation with
            strengths, gaps, and next steps.
          </p>
          <br></br>
          {loading ? (
            <div className="loading-block">Loading task prompts...</div>
          ) : (
            <form className="stack-form" onSubmit={handleSubmit}>
              <label>
                <span className="required-label">
                  Skill to prove
                  <span className="required-mark">*</span>
                </span>
                <select
                  required
                  disabled={!suggestedSkills.length}
                  value={form.skillCategory}
                  onChange={(event) => refreshTaskPrompt(event.target.value)}
                >
                  {!suggestedSkills.length ? (
                    <option value="">No skills available yet</option>
                  ) : null}
                  {suggestedSkills.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
              </label>
              <div className="selection-picker">
                <input
                  value={customSkill}
                  onChange={(event) => setCustomSkill(event.target.value)}
                  placeholder="Add a specific skill like React, SQL, or Prompt Engineering"
                />
                <button
                  type="button"
                  className="button secondary selection-add-button"
                  onClick={addCustomSkill}
                >
                  Use this skill
                </button>
              </div>
              <article className="proof-card">
                <strong>Task prompt</strong>
                {loadingPrompt ? (
                  <p>Generating a task for your selected skill...</p>
                ) : (
                  <p>
                    {form.taskPrompt ||
                      "Select or add a skill to generate a prompt."}
                  </p>
                )}
                {form.skillCategory ? (
                  <p className="muted">Focused skill: {form.skillCategory}</p>
                ) : null}
              </article>
              <label>
                <span className="required-label">
                  Your answer
                  <span className="required-mark">*</span>
                </span>
                <textarea
                  required
                  disabled={!hasTaskPrompt}
                  rows="9"
                  value={form.userSubmission}
                  onChange={(event) =>
                    setForm({ ...form, userSubmission: event.target.value })
                  }
                  placeholder="Write your response here."
                />
              </label>
              <button
                className="button primary"
                disabled={busy || !hasSelectedSkill || !hasTaskPrompt}
              >
                {busy ? "Evaluating..." : "Submit task"}
              </button>
            </form>
          )}
          {!loading && !suggestedSkills.length ? (
            <p className="status-banner">
              Add or update your target career and skills in onboarding so
              SkillBridge can suggest better proof tasks.
            </p>
          ) : null}

          {message ? <p className="status-banner">{message}</p> : null}
        </div>

        <div className="content-card accent-card skill-proof-results-card">
          <span className="eyebrow">AI evaluation</span>
          <h2>Result scorecard</h2>
          <br></br>
          {busy ? (
            <div className="loading-block">Generating your evaluation...</div>
          ) : result ? (
            <div className="roadmap-list">
              <article className="stat-card">
                <span>Verified score: </span>
                <strong>{result.aiScore}/100</strong>
              </article>
              <article className="proof-card">
                <strong>Strengths</strong>
                <div className="skill-badges">
                  {(result.strengths || []).map((item) => (
                    <span key={item} className="badge">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
              <article className="proof-card">
                <strong>Weaknesses</strong>
                <div className="skill-badges">
                  {(result.weaknesses || []).map((item) => (
                    <span key={item} className="badge subtle">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
              <article className="proof-card">
                <strong>Improvement suggestions</strong>
                <div className="skill-badges">
                  {(result.suggestions || []).map((item) => (
                    <span key={item} className="badge">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          ) : (
            <p className="muted">
              Submit a task to see a clean scorecard with feedback and verified
              skill signals.
            </p>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
