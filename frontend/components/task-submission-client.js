"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { SiteShell } from "./site-shell";

const questionOptions = [
  { value: "5", label: "5 questions" },
  { value: "10", label: "10 questions" },
  { value: "15", label: "15 questions" },
  { value: "20", label: "20 questions" },
  { value: "random", label: "Random (5–20)" },
];

export function TaskSubmissionClient() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const [skills, setSkills] = useState([]);
  const [skillCategory, setSkillCategory] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [questionCount, setQuestionCount] = useState("10");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!token || user?.role !== "student") {
      router.replace("/auth");
      return;
    }
    async function loadSkills() {
      try {
        const data = await authRequest("/ai/skill-task-prompts", token);
        const nextSkills = data.suggestedSkills || [];
        setSkills(nextSkills);
        setSkillCategory(data.selectedSkill || nextSkills[0] || "");
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    }
    loadSkills();
  }, [hydrated, token, user, router]);

  function chooseSkill(value) {
    setSkillCategory(value);
    setQuiz(null);
    setAnswers([]);
    setResult(null);
  }

  function addCustomSkill() {
    const normalized = customSkill.trim();
    if (!normalized) return;
    if (!skills.some((skill) => skill.toLowerCase() === normalized.toLowerCase())) {
      setSkills((current) => [...current, normalized]);
    }
    setCustomSkill("");
    chooseSkill(normalized);
  }

  async function generateQuiz() {
    if (!skillCategory) return;
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const data = await authRequest("/ai/skill-quiz", token, {
        method: "POST",
        body: JSON.stringify({ skillCategory, questionCount }),
      });
      setQuiz(data);
      setAnswers(Array(data.questions.length).fill(null));
      setMessage(data.aiStatus?.mode === "fallback" ? "Quiz generated in demo fallback mode." : "Your assessment is ready.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function selectAnswer(questionIndex, optionIndex) {
    setAnswers((current) => current.map((answer, index) => index === questionIndex ? optionIndex : answer));
  }

  async function submitQuiz(event) {
    event.preventDefault();
    if (!quiz || answers.some((answer) => answer === null)) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await authRequest("/ai/skill-task", token, {
        method: "POST",
        body: JSON.stringify({ quizId: quiz.quizId, answers }),
      });
      setResult(data.submission);
      setMessage("Assessment submitted and scored.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const answeredCount = answers.filter((answer) => answer !== null).length;

  return (
    <SiteShell>
      <section className="grid two-up">
        <div className="content-card">
          <span className="eyebrow">Skill Proof System</span>
          <h2>Prove your skill with an MCQ assessment</h2>
          <p>Choose the skill you want to prove and the number of questions. Your scorecard is generated from your answers—no long text response required.</p>
          <br />
          {loading ? <div className="loading-block">Loading your skills...</div> : !quiz ? (
            <div className="stack-form">
              <label>
                <span className="required-label">Skill to prove<span className="required-mark">*</span></span>
                <select value={skillCategory} onChange={(event) => chooseSkill(event.target.value)}>
                  {!skills.length ? <option value="">Select a skill</option> : null}
                  {skills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
                </select>
              </label>
              <div className="selection-picker">
                <input value={customSkill} onChange={(event) => setCustomSkill(event.target.value)} placeholder="Add a skill like React, SQL, or Python" />
                <button type="button" className="button secondary selection-add-button" onClick={addCustomSkill}>Use this skill</button>
              </div>
              <label>
                <span className="required-label">Number of MCQs<span className="required-mark">*</span></span>
                <select value={questionCount} onChange={(event) => setQuestionCount(event.target.value)}>
                  {questionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <button type="button" className="button primary" disabled={busy || !skillCategory} onClick={generateQuiz}>
                {busy ? "Generating assessment..." : "Generate MCQs"}
              </button>
            </div>
          ) : (
            <form className="stack-form" onSubmit={submitQuiz}>
              <div className="quiz-progress"><strong>{quiz.skillCategory}</strong><span>{answeredCount} / {quiz.questions.length} answered</span></div>
              {quiz.questions.map((item, questionIndex) => (
                <article className="proof-card quiz-question" key={`${item.question}-${questionIndex}`}>
                  <strong>{questionIndex + 1}. {item.question}</strong>
                  <div className="quiz-options">
                    {item.options.map((option, optionIndex) => (
                      <label className={`quiz-option ${answers[questionIndex] === optionIndex ? "selected" : ""}`} key={option}>
                        <input type="radio" name={`question-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => selectAnswer(questionIndex, optionIndex)} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </article>
              ))}
              <button className="button primary" disabled={busy || answeredCount !== quiz.questions.length}>
                {busy ? "Scoring assessment..." : "Submit assessment"}
              </button>
              <button type="button" className="button secondary" disabled={busy} onClick={() => setQuiz(null)}>Change assessment</button>
            </form>
          )}
          {message ? <p className="status-banner">{message}</p> : null}
        </div>
        <div className="content-card accent-card skill-proof-results-card">
          <span className="eyebrow">Assessment scorecard</span>
          <h2>Your result</h2>
          <br />
          {result ? <div className="roadmap-list">
            <article className="stat-card"><span>Verified score: </span><strong>{result.aiScore}/100</strong></article>
            <article className="stat-card"><span>Assessment: </span><strong>{result.userSubmission}</strong></article>
            <article className="proof-card"><strong>Strengths</strong><div className="skill-badges">{(result.strengths || []).map((item) => <span key={item} className="badge">{item}</span>)}</div></article>
            <article className="proof-card"><strong>Next steps</strong><div className="skill-badges">{(result.suggestions || []).map((item) => <span key={item} className="badge subtle">{item}</span>)}</div></article>
          </div> : <p className="muted">Generate and complete an assessment to see your verified scorecard.</p>}
        </div>
      </section>
    </SiteShell>
  );
}
