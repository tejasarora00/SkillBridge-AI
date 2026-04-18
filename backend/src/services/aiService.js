import OpenAI from 'openai';
import { env } from '../config/env.js';

const client = env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : null;
let lastHealthCheckAt = 0;
let activeModel = env.openAiModel;
let aiStatus = client
  ? {
      mode: 'unknown',
      available: true,
      message: 'OpenAI is configured but has not been checked yet.'
    }
  : {
      mode: 'fallback',
      available: false,
      message: 'OpenAI API key is missing. AI responses are using demo fallback mode.'
    };

function sanitizeStringList(value, count = 3) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, count);
}

function trimText(value, maxLength = 400) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function compactProfileForAi(profile = {}) {
  return {
    targetCareer: trimText(profile?.targetCareer, 120),
    educationLevel: trimText(profile?.educationLevel, 120),
    currentSkills: sanitizeStringList(profile?.currentSkills, 8).map((item) => trimText(item, 80)),
    interests: sanitizeStringList(profile?.interests, 8).map((item) => trimText(item, 80)),
    overallSkillScore: Math.max(0, Math.min(100, Number(profile?.overallSkillScore || 0))),
    roadmapSummary: trimText(profile?.roadmapSummary, 500),
    latestRoadmapMilestones: Array.isArray(profile?.latestRoadmapMilestones)
      ? profile.latestRoadmapMilestones
          .map((item) => ({
            title: trimText(item?.title, 120),
            timeline: trimText(item?.timeline, 80),
            focus: trimText(item?.focus, 200),
            output: trimText(item?.output, 200)
          }))
          .filter((item) => item.title || item.timeline || item.focus || item.output)
          .slice(0, 3)
      : []
  };
}

function compactRoadmapForAi(roadmap = {}) {
  return {
    targetRole: trimText(roadmap?.targetRole, 120),
    summary: trimText(roadmap?.summary, 600),
    currentStrengths: sanitizeStringList(roadmap?.currentStrengths, 6).map((item) => trimText(item, 100)),
    missingSkills: sanitizeStringList(roadmap?.missingSkills, 6).map((item) => trimText(item, 100)),
    recommendedNextSteps: sanitizeStringList(roadmap?.recommendedNextSteps, 6).map((item) => trimText(item, 160)),
    beginnerProject: trimText(roadmap?.beginnerProject, 240),
    intermediateProject: trimText(roadmap?.intermediateProject, 240),
    learningRoadmap: sanitizeStringList(roadmap?.learningRoadmap, 6).map((item) => trimText(item, 160)),
    milestones: Array.isArray(roadmap?.milestones)
      ? roadmap.milestones
          .map((item) => ({
            title: trimText(item?.title, 120),
            timeline: trimText(item?.timeline, 80),
            focus: trimText(item?.focus, 180),
            output: trimText(item?.output, 180)
          }))
          .filter((item) => item.title || item.timeline || item.focus || item.output)
          .slice(0, 3)
      : []
  };
}

function compactSubmissionForAi(payload = {}) {
  return {
    skillCategory: trimText(payload?.skillCategory, 80),
    userSubmission: trimText(payload?.userSubmission, 3500)
  };
}

function compactAnswersForAi(answers = []) {
  return Array.isArray(answers)
    ? answers.slice(0, 3).map((item) => trimText(item, 1500))
    : [];
}

function tokenizeText(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9+.]+/)
    .filter((item) => item && item.length > 2);
}

function getUniqueTerms(values = []) {
  return [...new Set(values.flatMap((value) => tokenizeText(value)))];
}

function getOverlapScore(sourceTerms = [], targetTerms = []) {
  if (!sourceTerms.length || !targetTerms.length) {
    return 0;
  }

  const targetSet = new Set(targetTerms);
  const shared = sourceTerms.filter((term) => targetSet.has(term)).length;
  return shared / Math.max(sourceTerms.length, 1);
}

function looksLikePlaceholderText(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const uniqueRatio = words.length ? new Set(words).size / words.length : 0;

  return (
    !normalized ||
    /^[\W_]+$/i.test(normalized) ||
    /^[-â€“â€”_.â€¢,;:|/\\()\[\]{}]+$/.test(normalized) ||
    /^([\-â€“â€”_.â€¢]\s*){2,}$/.test(normalized) ||
    /^(na|n\/a|none|null|nothing|idk|test|test test|asdf|qwer|abc|blah)$/i.test(normalized) ||
    words.length < 4 ||
    uniqueRatio < 0.35
  );
}

function assessSkillSubmission(payload = {}, profile = {}) {
  const submission = String(payload?.userSubmission || '').trim();
  const promptTerms = getUniqueTerms([payload?.taskPrompt, payload?.skillCategory]);
  const profileTerms = getUniqueTerms([
    profile?.targetCareer,
    ...(profile?.currentSkills || []),
    ...(profile?.interests || [])
  ]);
  const answerTerms = getUniqueTerms([submission]);
  const promptOverlap = getOverlapScore(answerTerms, promptTerms);
  const profileOverlap = getOverlapScore(answerTerms, profileTerms);
  const words = submission.split(/\s+/).filter(Boolean);

  const isClearlyInvalid =
    looksLikePlaceholderText(submission) ||
    words.length < 10 ||
    (promptOverlap === 0 && profileOverlap === 0 && words.length < 40);

  return {
    isClearlyInvalid,
    promptOverlap,
    profileOverlap
  };
}

function assessInterviewAnswers(profile = {}, answers = []) {
  const profileTerms = getUniqueTerms([
    profile?.targetCareer,
    ...(profile?.currentSkills || []),
    ...(profile?.interests || [])
  ]);

  const analyses = (answers || []).map((answer) => {
    const text = String(answer || '').trim();
    const words = text.split(/\s+/).filter(Boolean);
    const answerTerms = getUniqueTerms([text]);
    const profileOverlap = getOverlapScore(answerTerms, profileTerms);

    return {
      text,
      words,
      profileOverlap,
      isClearlyInvalid:
        looksLikePlaceholderText(text) ||
        words.length < 8 ||
        (profileOverlap === 0 && words.length < 30)
    };
  });

  const invalidAnswers = analyses.filter((item) => item.isClearlyInvalid).length;

  return {
    invalidAnswers,
    isClearlyInvalid: invalidAnswers >= 2 || analyses.every((item) => item.isClearlyInvalid)
  };
}

function validateRoadmapPayload(result, profile) {
  return {
    summary:
      String(result?.summary || '').trim() ||
      `A focused roadmap for moving toward ${profile.targetCareer} through guided practice and proof of skill.`,
    currentStrengths: sanitizeStringList(result?.currentStrengths),
    missingSkills: sanitizeStringList(result?.missingSkills),
    recommendedNextSteps: sanitizeStringList(result?.recommendedNextSteps),
    beginnerProject:
      String(result?.beginnerProject || '').trim() ||
      `Build a small starter project related to ${profile.targetCareer}.`,
    intermediateProject:
      String(result?.intermediateProject || '').trim() ||
      `Ship a portfolio-grade project that proves readiness for ${profile.targetCareer}.`,
    learningRoadmap: sanitizeStringList(result?.learningRoadmap),
    milestones: Array.isArray(result?.milestones)
      ? result.milestones
          .map((item) => ({
            title: String(item?.title || '').trim(),
            timeline: String(item?.timeline || '').trim(),
            focus: String(item?.focus || '').trim(),
            output: String(item?.output || '').trim()
          }))
          .filter((item) => item.title && item.timeline && item.focus && item.output)
          .slice(0, 3)
      : []
  };
}

function validateTaskEvaluation(result, fallbackScore = 70) {
  return {
    score: Math.max(0, Math.min(100, Number(result?.score || fallbackScore))),
    strengths: sanitizeStringList(result?.strengths),
    weaknesses: sanitizeStringList(result?.weaknesses),
    suggestions: sanitizeStringList(result?.suggestions)
  };
}

function validateInterviewQuestions(result, targetCareer) {
  const questions = sanitizeStringList(result?.questions, 3);
  if (questions.length === 3) {
    return questions;
  }

  return [
    `Tell me why you want to grow into a ${targetCareer} role.`,
    `Describe a project or task where you solved a meaningful problem.`,
    `How would you improve your current skills over the next 90 days?`
  ];
}

function validateInterviewEvaluation(result) {
  return {
    communicationScore: Math.max(0, Math.min(100, Number(result?.communicationScore || 72))),
    confidenceScore: Math.max(0, Math.min(100, Number(result?.confidenceScore || 70))),
    technicalClarityScore: Math.max(0, Math.min(100, Number(result?.technicalClarityScore || 74))),
    improvementTip:
      String(result?.improvementTip || '').trim() ||
      'Use more concrete examples with clearer structure and measurable outcomes.'
  };
}

function validateTaskCategories(result, availableTasks) {
  const allowedCategories = new Set(
    (availableTasks || []).map((task) => String(task.skillCategory || '').trim().toLowerCase())
  );

  const categories = Array.isArray(result?.categories)
    ? result.categories
        .map((item) => String(item || '').trim().toLowerCase())
        .filter((item) => allowedCategories.has(item))
    : [];

  return [...new Set(categories)].slice(0, 3);
}

function validateSkillTaskPrompt(result, skillName, fallbackPrompt) {
  return {
    skillCategory: String(result?.skillCategory || skillName || '').trim() || skillName,
    taskPrompt: String(result?.taskPrompt || '').trim() || fallbackPrompt
  };
}

function validateEmailDraft(result, fallback) {
  return {
    subject: String(result?.subject || '').trim() || fallback.subject,
    body: String(result?.body || '').trim() || fallback.body
  };
}

function validateResumeAtsAnalysis(result, fallback) {
  const scoreBreakdown = Array.isArray(result?.scoreBreakdown)
    ? result.scoreBreakdown
        .map((item) => ({
          label: String(item?.label || '').trim(),
          score: Math.max(0, Math.min(100, Number(item?.score || 0)))
        }))
        .filter((item) => item.label)
        .slice(0, 4)
    : [];

  const sectionChecks = Array.isArray(result?.sectionChecks)
    ? result.sectionChecks
        .map((item) => ({
          label: String(item?.label || '').trim(),
          present: Boolean(item?.present)
        }))
        .filter((item) => item.label)
        .slice(0, 6)
    : [];

  const matchedKeywords = sanitizeStringList(result?.keywordCoverage?.matched, 12);
  const missingKeywords = sanitizeStringList(result?.keywordCoverage?.missing, 12);

  return {
    atsScore: Math.max(0, Math.min(100, Number(result?.atsScore || fallback.atsScore || 0))),
    scoreBreakdown: scoreBreakdown.length ? scoreBreakdown : fallback.scoreBreakdown,
    strengths: sanitizeStringList(result?.strengths, 5).length
      ? sanitizeStringList(result?.strengths, 5)
      : fallback.strengths,
    suggestions: sanitizeStringList(result?.suggestions, 6).length
      ? sanitizeStringList(result?.suggestions, 6)
      : fallback.suggestions,
    sectionChecks: sectionChecks.length ? sectionChecks : fallback.sectionChecks,
    keywordCoverage: {
      matched: matchedKeywords.length ? matchedKeywords : fallback.keywordCoverage?.matched || [],
      missing: missingKeywords.length ? missingKeywords : fallback.keywordCoverage?.missing || []
    },
    summary:
      String(result?.summary || '').trim() ||
      fallback.summary ||
      'Resume ATS review completed.'
  };
}

function mockRoadmap(profile) {
  const targetCareer = profile.targetCareer || 'AI Product Builder';
  const currentSkills = profile.currentSkills?.length
    ? profile.currentSkills
    : ['Problem solving', 'Communication', 'Git'];

  return validateRoadmapPayload(
    {
      summary: `This roadmap helps the student move toward ${targetCareer} through practical projects, visible proof of skill, and a simple 3-step learning path.`,
      currentStrengths: currentSkills.slice(0, 3),
      missingSkills: ['Project storytelling', 'Portfolio evidence', 'Interview communication'],
      recommendedNextSteps: [
        `Deepen one core ${targetCareer} skill through a weekly build cycle.`,
        'Document work with recruiter-friendly summaries.',
        'Collect feedback through practical task submissions.'
      ],
      beginnerProject: `Create a beginner-friendly mini build related to ${targetCareer} and explain the decisions you made.`,
      intermediateProject: `Ship a stronger portfolio project that simulates real work in ${targetCareer}.`,
      learningRoadmap: [
        'Learn the role fundamentals and refresh your profile.',
        'Build projects that show practical execution.',
        'Practice feedback loops and prepare for hiring conversations.'
      ],
      milestones: [
        {
          title: `Weeks 1-2: Foundations for ${targetCareer}`,
          timeline: '2 weeks',
          focus: `Strengthen ${currentSkills[0]} and create a focused practice routine.`,
          output: 'A profile refresh, role summary, and one mini build.'
        },
        {
          title: 'Weeks 3-6: Skill-building sprint',
          timeline: '4 weeks',
          focus: `Build two practical pieces that highlight ${currentSkills.slice(0, 2).join(' and ')}.`,
          output: 'Two portfolio-ready projects with short writeups.'
        },
        {
          title: 'Weeks 7-10: Feedback and hiring prep',
          timeline: '4 weeks',
          focus: 'Practice task submissions, close skill gaps, and refine your story.',
          output: 'Three AI-reviewed submissions and a stronger job pitch.'
        }
      ]
    },
    profile
  );
}

function mockSkillEvaluation(payload, profile) {
  const quality = assessSkillSubmission(payload, profile);
  const inferredSkill = payload.skillCategory || profile.currentSkills?.[0] || profile.targetCareer || 'Execution';
  const rawText = String(payload.userSubmission || '').trim();
  const normalizedText = rawText.toLowerCase();
  const words = rawText.split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words.map((word) => word.toLowerCase()));
  const uniqueRatio = words.length ? uniqueWords.size / words.length : 0;
  const hasStructure = /[.!?]/.test(rawText) || rawText.includes('\n');
  const mentionsReasoning =
    /(because|approach|strategy|example|result|tradeoff|metric|user|build|analysis|design|implement)/i.test(rawText);
  const onlySymbolsPattern = /^[\W_]+$/i.test(rawText);
  const repeatedPlaceholderPattern =
    /^[-–—_.•,;:|/\\()\[\]{}]+$/.test(rawText) ||
    /^([\-–—_.•]\s*){2,}$/.test(rawText) ||
    /^(na|n\/a|none|null|nothing|test)$/i.test(normalizedText);
  const randomPattern =
    !rawText ||
    onlySymbolsPattern ||
    repeatedPlaceholderPattern ||
    words.length < 12 ||
    uniqueRatio < 0.45 ||
    /^[a-z\s]+$/i.test(rawText) && rawText.length < 30 ||
    /(asdf|qwer|random|blah|lorem ipsum|idk|nothing|test test|abc abc)/i.test(normalizedText);

  let score = 10;
  score += Math.min(32, Math.floor(words.length * 0.9));
  score += Math.min(16, Math.floor(rawText.length / 80));
  score += hasStructure ? 10 : 0;
  score += mentionsReasoning ? 14 : 0;
  score += uniqueRatio > 0.7 ? 8 : uniqueRatio > 0.55 ? 4 : 0;

  if (onlySymbolsPattern || repeatedPlaceholderPattern) {
    score = Math.min(score, 5);
  } else if (randomPattern) {
    score = Math.min(score, 22);
  }

  score = Math.max(0, Math.min(94, score));

  if (quality.isClearlyInvalid) {
    score = 0;
  }

  const strengths = randomPattern || quality.isClearlyInvalid
    ? ['A submission was received, but it does not yet show enough real evidence of skill.']
    : [
        `Shows practical understanding of ${inferredSkill}.`,
        'Communicates the approach in a clear, recruiter-friendly way.',
        'Provides enough context to understand the work.'
      ];

  const weaknesses = randomPattern || quality.isClearlyInvalid
    ? [
        'Response is too brief, too generic, or too placeholder-like to verify real skill level.',
        'Needs clearer reasoning, examples, and task-specific detail.'
      ]
    : [
        'Could include more measurable results or validation.',
        'Would be stronger with a clearer explanation of tradeoffs.'
      ];

  const suggestions = randomPattern || quality.isClearlyInvalid
    ? [
        'Write a real response that directly answers the task instead of using filler or placeholder text.',
        'Explain your reasoning step by step with one concrete example.',
        'Mention tools, tradeoffs, and the outcome you are aiming for.'
      ]
    : [
        'Add one concise before-and-after metric.',
        'Mention tools, constraints, and what you would improve next.',
        'Include a link to code, demo, or screenshots when available.'
      ];

  return validateTaskEvaluation({
    score,
    strengths,
    weaknesses,
    suggestions
  });
}

function mockInterviewQuestions(profile) {
  return validateInterviewQuestions(
    {
      questions: [
        `Why are you pursuing a ${profile.targetCareer} path right now?`,
        `Tell me about a project that best represents your current skills.`,
        `How would you handle feedback while learning ${profile.targetCareer}?`
      ]
    },
    profile.targetCareer
  );
}

function mockInterviewEvaluation(answers) {
  const quality = assessInterviewAnswers({}, answers);
  const totalLength = answers.reduce((sum, item) => sum + String(item || '').length, 0);
  const scoreBase = Math.min(18, Math.floor(totalLength / 80));

  const evaluation = validateInterviewEvaluation({
    communicationScore: 68 + scoreBase,
    confidenceScore: 66 + scoreBase,
    technicalClarityScore: 70 + scoreBase,
    improvementTip: 'Use a tighter STAR-style structure and include one concrete result in each answer.'
  });

  if (quality.isClearlyInvalid) {
    return {
      communicationScore: 0,
      confidenceScore: 0,
      technicalClarityScore: 0,
      improvementTip: 'Your answers were too brief, placeholder-like, or unrelated. Answer each question with relevant examples to earn a score.'
    };
  }

  return evaluation;
}

function mockTaskCategories(profile, availableTasks = []) {
  const targetCareer = String(profile?.targetCareer || '').toLowerCase();
  const profileTerms = [
    targetCareer,
    ...(profile?.currentSkills || []).map((item) => String(item || '').toLowerCase()),
    ...(profile?.interests || []).map((item) => String(item || '').toLowerCase())
  ].filter(Boolean);

  const ranked = availableTasks
    .map((task) => {
      const relatedTerms = (task.relatedTerms || []).map((item) => String(item || '').toLowerCase());
      const score = profileTerms.reduce(
        (sum, term) =>
          sum +
          (relatedTerms.some(
            (relatedTerm) => relatedTerm.includes(term) || term.includes(relatedTerm)
          )
            ? 1
            : 0),
        0
      );
      return { task, score };
    })
    .sort((left, right) => right.score - left.score);

  const categories = ranked
    .filter((item) => item.score > 0)
    .slice(0, 3)
    .map((item) => item.task.skillCategory);

  return categories.length
    ? categories
    : availableTasks.slice(0, 2).map((task) => task.skillCategory);
}

function mockGeneratedSkillTaskPrompt(profile, skillName) {
  const targetCareer = profile?.targetCareer || 'your chosen role';
  const normalizedSkill = String(skillName || '').trim() || 'core skill';

  return validateSkillTaskPrompt(
    {
      skillCategory: normalizedSkill,
      taskPrompt: `Create a short practical response that proves your ${normalizedSkill} skill for a ${targetCareer} path. Explain one realistic scenario, the approach you would take, the tools or methods you would use, and the result you would aim to achieve.`
    },
    normalizedSkill,
    `Explain how you would use ${normalizedSkill} in a realistic ${targetCareer} scenario.`
  );
}

function mockExpertSessionEmailDraft({ expertEmail, request, studentProfile }) {
  const studentName = request?.name || 'Student';
  const targetCareer = studentProfile?.targetCareer || 'their target role';
  const educationLevel = studentProfile?.educationLevel || 'their current education level';
  const currentSkills = Array.isArray(studentProfile?.currentSkills) && studentProfile.currentSkills.length
    ? studentProfile.currentSkills.join(', ')
    : 'Not shared yet';
  const interests = Array.isArray(studentProfile?.interests) && studentProfile.interests.length
    ? studentProfile.interests.join(', ')
    : 'Not shared yet';
  const slotLabel = request?.slotLabel || 'Requested slot not available';
  const subject = `Expert Session Request: ${studentName} for ${slotLabel}`;
  const body = `Hello,

I am reaching out from SkillBridge AI to connect you with a student who has requested a 1:1 expert session.

Student details:
- Name: ${studentName}
- Email: ${request?.email || 'Unavailable'}
- Phone: ${request?.phone || 'Unavailable'}
- Target career: ${targetCareer}
- Education level: ${educationLevel}
- Current skills: ${currentSkills}
- Interests: ${interests}
- Preferred slot: ${slotLabel}

Student's message:
${request?.message || 'No message shared.'}

If this works for you, please reply to the student directly at ${request?.email || 'their email'} and coordinate the session.

Thank you,
SkillBridge AI Admin Team`;

  return {
    to: expertEmail,
    subject,
    body
  };
}

function mockRecruiterFitSummary({ profile, matchedRole, verifiedTaskScore, fallbackSummary }) {
  const currentSkills = sanitizeStringList(profile?.currentSkills, 6);
  const skillLine = currentSkills.length
    ? `Current skills include ${currentSkills.join(', ')}.`
    : 'Current skills are still emerging in the profile.';
  const targetCareer = trimText(profile?.targetCareer, 120) || 'the chosen role';
  const roleLine = matchedRole
    ? `The strongest alignment is toward ${matchedRole}.`
    : `The student is aiming for ${targetCareer}.`;
  const scoreLine = `Verified task evidence currently stands at ${Math.max(
    0,
    Math.min(100, Number(verifiedTaskScore || 0))
  )}/100.`;

  return {
    summary:
      fallbackSummary ||
      `${roleLine} ${skillLine} ${scoreLine} Overall, the candidate shows practical potential with skills that can be mapped to recruiter needs.`
  };
}

function extractJson(text, fallback) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return fallback;
    }

    return JSON.parse(match[0]);
  } catch {
    return fallback;
  }
}

function getResponseText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const chunks = Array.isArray(response?.output)
    ? response.output.flatMap((item) =>
        Array.isArray(item?.content)
          ? item.content
              .filter((part) => part?.type === 'output_text' && typeof part?.text === 'string')
              .map((part) => part.text)
          : []
      )
    : [];

  return chunks.join('\n').trim();
}

function toAiErrorMessage(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();

  if (message.includes('quota') || message.includes('429') || message.includes('rate limit')) {
    return 'OpenAI quota exceeded, billing is inactive, or rate limits were reached. AI responses are using demo fallback mode.';
  }

  if (
    code.includes('model_not_found') ||
    message.includes('model') && message.includes('not found') ||
    message.includes('does not exist') ||
    message.includes('do not have access')
  ) {
    return 'Configured OpenAI model is unavailable for this API key. AI responses are using demo fallback mode.';
  }

  if (
    message.includes('api key') ||
    message.includes('invalid_api_key') ||
    message.includes('unauthorized') ||
    message.includes('permission')
  ) {
    return 'OpenAI API key is invalid. AI responses are using demo fallback mode.';
  }

  return 'OpenAI is temporarily unavailable. AI responses are using demo fallback mode.';
}

function isRetryableAiError(error) {
  const message = String(error?.message || error || '').toLowerCase();

  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('socket') ||
    message.includes('connection') ||
    message.includes('econnreset') ||
    message.includes('503') ||
    message.includes('502') ||
    message.includes('500')
  );
}

function isModelAccessError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  const status = Number(error?.status || 0);

  return (
    code.includes('model_not_found') ||
    message.includes('model') && message.includes('not found') ||
    message.includes('does not exist') ||
    message.includes('do not have access') ||
    message.includes('unsupported model') ||
    (status === 404 && message.includes('model'))
  );
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createAiResponse(input) {
  let lastError;
  const modelCandidates = [...new Set([env.openAiModel, 'gpt-4.1-mini'].filter(Boolean))];

  for (const model of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await client.responses.create({
          model,
          input
        });
        activeModel = model;
        return response;
      } catch (error) {
        lastError = error;

        if (isModelAccessError(error) && model !== modelCandidates[modelCandidates.length - 1]) {
          break;
        }

        const shouldRetry = attempt === 0 && isRetryableAiError(error);
        if (!shouldRetry) {
          throw error;
        }

        await delay(700);
      }
    }
  }

  throw lastError;
}

async function verifyOpenAiConnection(force = false) {
  if (!client) {
    aiStatus = {
      mode: 'fallback',
      available: false,
      message: 'OpenAI API key is missing. AI responses are using demo fallback mode.'
    };
    return aiStatus;
  }

  const now = Date.now();
  if (!force && aiStatus.mode !== 'unknown' && now - lastHealthCheckAt < 5 * 60 * 1000) {
    return aiStatus;
  }

  try {
    await createAiResponse('Reply with only: OK.');

    aiStatus = {
      mode: 'live',
      available: true,
      message: ''
    };
  } catch (error) {
    aiStatus = {
      mode: 'fallback',
      available: false,
      message: toAiErrorMessage(error)
    };
  }

  lastHealthCheckAt = now;
  return aiStatus;
}

async function requestStructuredResponse(prompt, fallback) {
  if (!client) {
    aiStatus = {
      mode: 'fallback',
      available: false,
      message: 'OpenAI API key is missing. AI responses are using demo fallback mode.'
    };

    return {
      payload: fallback,
      meta: aiStatus
    };
  }

  try {
    const response = await createAiResponse(prompt);

    const text = getResponseText(response);

    aiStatus = {
      mode: 'live',
      available: true,
      message: ''
    };

    return {
      payload: extractJson(text, fallback),
      meta: aiStatus
    };
  } catch (error) {
    console.error('OpenAI request failed:', error?.message || error);
    aiStatus = {
      mode: 'fallback',
      available: false,
      message: toAiErrorMessage(error)
    };

    return {
      payload: fallback,
      meta: aiStatus
    };
  }
}

export async function generateRoadmap(profile) {
  const fallback = mockRoadmap(profile);
  const compactProfile = compactProfileForAi(profile);

  const prompt = `
Return valid JSON only with this shape:
{
  "summary": "string",
  "currentStrengths": ["string"],
  "missingSkills": ["string"],
  "recommendedNextSteps": ["string"],
  "beginnerProject": "string",
  "intermediateProject": "string",
  "learningRoadmap": ["string"],
  "milestones": [
    { "title": "string", "timeline": "string", "focus": "string", "output": "string" }
  ]
}

Create a deterministic, concise AI Career GPS response for this student:
${JSON.stringify(compactProfile, null, 2)}
`.trim();

  const { payload, meta } = await requestStructuredResponse(prompt, fallback);
  return {
    data: validateRoadmapPayload(payload, profile),
    meta
  };
}

function refineMockRoadmap(profile, roadmap, userMessage) {
  const baseRoadmap = roadmap || mockRoadmap(profile);
  const note = String(userMessage || '').trim();

  return validateRoadmapPayload(
    {
      ...baseRoadmap,
      summary: note
        ? `${baseRoadmap.summary} Updated with student context: ${note}`
        : baseRoadmap.summary,
      recommendedNextSteps: [
        ...(baseRoadmap.recommendedNextSteps || []).slice(0, 2),
        note
          ? `Adjust the plan to reflect: ${note}`
          : `Refine the plan for ${profile.targetCareer || 'the chosen role'}.`
      ],
      learningRoadmap: [
        ...(baseRoadmap.learningRoadmap || []).slice(0, 2),
        note
          ? `Update the final step to incorporate the student's new priorities: ${note}`
          : 'Revisit the roadmap and tailor the final milestone.'
      ]
    },
    profile
  );
}

function roadmapLooksUnchanged(previousRoadmap = {}, nextRoadmap = {}) {
  return (
    String(previousRoadmap.summary || '').trim() ===
      String(nextRoadmap.summary || '').trim() &&
    JSON.stringify(previousRoadmap.recommendedNextSteps || []) ===
      JSON.stringify(nextRoadmap.recommendedNextSteps || []) &&
    JSON.stringify(previousRoadmap.learningRoadmap || []) ===
      JSON.stringify(nextRoadmap.learningRoadmap || [])
  );
}

export async function refineRoadmap(profile, roadmap, userMessage) {
  const fallback = refineMockRoadmap(profile, roadmap, userMessage);
  const compactProfile = compactProfileForAi(profile);
  const compactRoadmap = compactRoadmapForAi(roadmap || {});

  const prompt = `
Return valid JSON only with this shape:
{
  "summary": "string",
  "currentStrengths": ["string"],
  "missingSkills": ["string"],
  "recommendedNextSteps": ["string"],
  "beginnerProject": "string",
  "intermediateProject": "string",
  "learningRoadmap": ["string"],
  "milestones": [
    { "title": "string", "timeline": "string", "focus": "string", "output": "string" }
  ],
  "assistantReply": "string"
}

Revise the student's roadmap based on the student's new guidance.
Keep the roadmap concise, practical, and aligned to the target career.

Student profile:
${JSON.stringify(compactProfile, null, 2)}

Current roadmap:
${JSON.stringify(compactRoadmap, null, 2)}

Student guidance:
${JSON.stringify({ userMessage: trimText(userMessage, 1000) }, null, 2)}
`.trim();

  const { payload, meta } = await requestStructuredResponse(prompt, {
    ...fallback,
    assistantReply: userMessage
      ? `I updated your roadmap using this extra context: ${userMessage}`
      : 'I updated your roadmap with your latest guidance.'
  });

  let nextRoadmap = validateRoadmapPayload(
    {
      ...(roadmap || {}),
      ...(payload || {})
    },
    profile
  );

  if (roadmapLooksUnchanged(roadmap || {}, nextRoadmap)) {
    nextRoadmap = refineMockRoadmap(profile, roadmap, userMessage);
  }

  return {
    data: {
      roadmap: nextRoadmap,
      assistantReply:
        String(payload?.assistantReply || '').trim() ||
        `I updated your roadmap using this extra context: ${userMessage}`
    },
    meta
  };
}

export async function evaluateSkillSubmission(payload, profile) {
  const fallback = mockSkillEvaluation(payload, profile);
  const quality = assessSkillSubmission(payload, profile);
  const compactProfile = compactProfileForAi(profile);
  const compactPayload = compactSubmissionForAi(payload);

  const prompt = `
Return valid JSON only with this shape:
{
  "score": 0,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestions": ["string"]
}

Evaluate this student task submission for a practical skill proof system.
If the submission is clearly irrelevant, placeholder-like, nonsensical, or does not answer the task, give a score of 0.
Student profile:
${JSON.stringify(compactProfile, null, 2)}

Submission:
${JSON.stringify(compactPayload, null, 2)}
`.trim();

  const response = await requestStructuredResponse(prompt, fallback);
  const validated = validateTaskEvaluation(response.payload, fallback.score);

  if (quality.isClearlyInvalid) {
    return {
      data: {
        score: 0,
        strengths: [],
        weaknesses: [
          'Submission does not show a valid answer to the task.',
          'Response is too brief, irrelevant, or placeholder-like to verify skill.'
        ],
        suggestions: [
          'Answer the exact prompt directly.',
          'Use a concrete example, explain your reasoning, and add task-specific detail.',
          'Avoid filler text or unrelated content.'
        ]
      },
      meta: response.meta
    };
  }

  return {
    data: validated,
    meta: response.meta
  };
}

export async function suggestTaskCategories(profile, availableTasks) {
  const fallback = {
    categories: mockTaskCategories(profile, availableTasks)
  };
  const compactProfile = compactProfileForAi(profile);

  const prompt = `
Return valid JSON only with this shape:
{
  "categories": ["string"]
}

Choose up to 3 task categories from the available task catalog that best fit this student.
Only return categories that exist in the available task catalog.

Student profile:
${JSON.stringify(compactProfile, null, 2)}

Available task catalog:
${JSON.stringify(
    (availableTasks || []).map((task) => ({
      skillCategory: task.skillCategory,
      relatedTerms: task.relatedTerms
    })),
    null,
    2
  )}
`.trim();

  const { payload, meta } = await requestStructuredResponse(prompt, fallback);
  const validatedCategories = validateTaskCategories(payload, availableTasks);

  return {
    data: validatedCategories.length ? validatedCategories : fallback.categories,
    meta
  };
}

export async function generateSkillTaskPrompt(profile, skillName) {
  const normalizedSkill = String(skillName || '').trim();
  const fallback = mockGeneratedSkillTaskPrompt(profile, normalizedSkill);
  const compactProfile = compactProfileForAi(profile);

  const prompt = `
Return valid JSON only with this shape:
{
  "skillCategory": "string",
  "taskPrompt": "string"
}

Generate one short practical task prompt that helps a student prove this exact skill in a realistic, portfolio-relevant way.
Keep it specific, actionable, and aligned to the student's career direction.

Requested skill:
${JSON.stringify({ skillName: normalizedSkill }, null, 2)}

Student profile:
${JSON.stringify(compactProfile, null, 2)}
`.trim();

  const { payload, meta } = await requestStructuredResponse(prompt, fallback);

  return {
    data: validateSkillTaskPrompt(payload, normalizedSkill, fallback.taskPrompt),
    meta
  };
}

export async function generateExpertSessionEmailDraft({ expertEmail, request, studentProfile }) {
  const fallback = mockExpertSessionEmailDraft({ expertEmail, request, studentProfile });
  const compactRequest = {
    name: trimText(request?.name, 120),
    email: trimText(request?.email, 120),
    phone: trimText(request?.phone, 40),
    message: trimText(request?.message, 1200),
    slotLabel: trimText(request?.slotLabel, 200)
  };
  const compactProfile = compactProfileForAi(studentProfile || {});

  const prompt = `
Return valid JSON only with this shape:
{
  "subject": "string",
  "body": "string"
}

Write a polished, professional email from the SkillBridge AI admin team to an industry expert.
The goal is to introduce the student, summarize the student's profile and request, and ask the expert to coordinate a 1:1 session.
Do not invent details. Use the provided student profile and booking request.

Expert email:
${JSON.stringify({ expertEmail }, null, 2)}

Student booking request:
${JSON.stringify(compactRequest, null, 2)}

Student profile:
${JSON.stringify(compactProfile, null, 2)}
`.trim();

  const { payload, meta } = await requestStructuredResponse(prompt, fallback);

  return {
    data: validateEmailDraft(payload, fallback),
    meta
  };
}

export async function generateResumeAtsAnalysis({ profile, resumeText, fallback }) {
  const compactProfile = compactProfileForAi(profile || {});
  const prompt = `
Return valid JSON only with this shape:
{
  "atsScore": 0,
  "scoreBreakdown": [
    { "label": "Keyword match", "score": 0 },
    { "label": "Section structure", "score": 0 },
    { "label": "Formatting safety", "score": 0 },
    { "label": "Content strength", "score": 0 }
  ],
  "strengths": ["string"],
  "suggestions": ["string"],
  "sectionChecks": [
    { "label": "string", "present": true }
  ],
  "keywordCoverage": {
    "matched": ["string"],
    "missing": ["string"]
  },
  "summary": "string"
}

You are acting like a professional ATS resume checker.
Score this resume primarily against the student's target career and the keywords/skills that matter for that target career.
The score should reflect:
1. how well the resume matches target-career keywords,
2. ATS-friendly section structure,
3. formatting/readability for ATS systems,
4. overall resume content quality.

Be strict and realistic. Do not give inflated scores.
If the target career is specific, evaluate keyword relevance against that role very directly.

Student profile:
${JSON.stringify(compactProfile, null, 2)}

Resume text:
${JSON.stringify(trimText(resumeText, 7000), null, 2)}
`.trim();

  const { payload, meta } = await requestStructuredResponse(prompt, fallback);

  return {
    data: validateResumeAtsAnalysis(payload, fallback),
    meta
  };
}

export async function generateRecruiterFitSummary({
  profile,
  matchedRole,
  verifiedTaskScore,
  fallbackSummary
}) {
  const fallback = mockRecruiterFitSummary({
    profile,
    matchedRole,
    verifiedTaskScore,
    fallbackSummary
  });
  const compactProfile = compactProfileForAi(profile || {});
  const prompt = `
Return valid JSON only with this shape:
{
  "summary": "string"
}

You are writing a recruiter-facing candidate fit summary.
Use the student's current skills, target career, and verified task score to explain fit in a concise, practical way.
Do not mention identity bias or hidden profile details.
Do not invent experience that is not present.
Focus on skill signals, role alignment, and practical readiness.

Student profile:
${JSON.stringify(compactProfile, null, 2)}

Matched recruiter role:
${JSON.stringify({ matchedRole: trimText(matchedRole, 120) }, null, 2)}

Verified task score:
${JSON.stringify({ verifiedTaskScore: Math.max(0, Math.min(100, Number(verifiedTaskScore || 0))) }, null, 2)}
`.trim();

  const { payload, meta } = await requestStructuredResponse(prompt, fallback);

  return {
    data: {
      summary: trimText(payload?.summary || fallback.summary, 500)
    },
    meta
  };
}

export async function generateInterviewQuestions(profile) {
  const fallback = { questions: mockInterviewQuestions(profile) };
  const compactProfile = compactProfileForAi(profile);
  const prompt = `
Return valid JSON only with this shape:
{
  "questions": ["string", "string", "string"]
}

Generate 3 short mock interview questions for this student:
${JSON.stringify(compactProfile, null, 2)}
`.trim();

  const { payload, meta } = await requestStructuredResponse(prompt, fallback);
  return {
    data: validateInterviewQuestions(payload, profile.targetCareer || 'this career'),
    meta
  };
}

export async function evaluateInterviewAnswers(profile, answers) {
  const fallback = mockInterviewEvaluation(answers);
  const quality = assessInterviewAnswers(profile, answers);
  const compactProfile = compactProfileForAi(profile);
  const compactAnswers = compactAnswersForAi(answers);
  const prompt = `
Return valid JSON only with this shape:
{
  "communicationScore": 0,
  "confidenceScore": 0,
  "technicalClarityScore": 0,
  "improvementTip": "string"
}

Evaluate these student mock interview answers.
If the answers are clearly irrelevant, placeholder-like, nonsensical, or fail to answer the questions, give 0 for all three scores.
Student profile:
${JSON.stringify(compactProfile, null, 2)}

Answers:
${JSON.stringify(compactAnswers, null, 2)}
`.trim();

  const { payload, meta } = await requestStructuredResponse(prompt, fallback);

  if (quality.isClearlyInvalid) {
    return {
      data: {
        communicationScore: 0,
        confidenceScore: 0,
        technicalClarityScore: 0,
        improvementTip:
          'Your answers were too brief, unrelated, or placeholder-like. Answer each question directly with relevant examples to receive a score.'
      },
      meta
    };
  }

  return {
    data: validateInterviewEvaluation(payload),
    meta
  };
}

export function getAiStatus() {
  return aiStatus;
}

export async function getVerifiedAiStatus(force = false) {
  return verifyOpenAiConnection(force);
}
