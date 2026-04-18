import { CandidateMatch, JobPosting, Roadmap, SkillTaskSubmission, StudentProfile } from '../models/index.js';
import { PDFParse } from 'pdf-parse';
import {
  evaluateInterviewAnswers,
  evaluateSkillSubmission,
  generateResumeAtsAnalysis,
  generateSkillTaskPrompt,
  getAiStatus,
  getVerifiedAiStatus,
  generateInterviewQuestions,
  generateRoadmap,
  refineRoadmap,
  suggestTaskCategories
} from '../services/aiService.js';
import { calculateCandidateMatch } from '../services/matchService.js';
import {
  getTaskPromptByCategory,
  listAllTaskPrompts,
  listTaskPrompts
} from '../services/taskCatalogService.js';

const KNOWN_SKILLS = [
  'react',
  'next.js',
  'javascript',
  'typescript',
  'node.js',
  'apis',
  'sql',
  'python',
  'dashboarding',
  'data analysis',
  'accessibility',
  'content writing',
  'copywriting',
  'prompt engineering',
  'frontend development'
];

const ATS_SECTION_PATTERNS = [
  { label: 'Contact information', pattern: /(email|phone|mobile|linkedin|github)/i },
  { label: 'Professional summary', pattern: /(summary|profile|objective)/i },
  { label: 'Skills section', pattern: /\bskills\b/i },
  { label: 'Experience section', pattern: /(experience|employment|work history)/i },
  { label: 'Education section', pattern: /\beducation\b/i }
];

function looksLikeMeaningfulResume(text) {
  const normalized = String(text || '').trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const alphaCount = (normalized.match(/[a-z]/gi) || []).length;
  const signals = ['experience', 'skills', 'project', 'education', 'email', 'phone', 'react', 'python', 'sql'];
  const signalCount = signals.filter((term) => normalized.toLowerCase().includes(term)).length;

  if (words.length < 20) {
    return false;
  }

  if (alphaCount < 60) {
    return false;
  }

  if (signalCount < 2) {
    return false;
  }

  return true;
}

function extractClaimedSkills(resumeText) {
  const lowerResume = String(resumeText || '').toLowerCase();
  return KNOWN_SKILLS.filter((skill) => lowerResume.includes(skill)).map((skill) =>
    skill
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function analyzeResumeForAts(resumeText, profile) {
  const normalizedText = String(resumeText || '').trim();
  const lowerText = normalizedText.toLowerCase();
  const words = normalizedText.split(/\s+/).filter(Boolean);
  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const currentSkills = (profile?.currentSkills || [])
    .map((skill) => String(skill || '').trim())
    .filter(Boolean);
  const targetCareer = String(profile?.targetCareer || '').trim();

  const skillMatches = currentSkills.filter((skill) =>
    lowerText.includes(skill.toLowerCase())
  );

  const careerKeywords = [
    targetCareer,
    ...targetCareer.split(/[\s/,-]+/),
    ...currentSkills
  ]
    .map((value) => String(value || '').trim())
    .filter((value) => value.length >= 3);

  const uniqueCareerKeywords = careerKeywords.filter(
    (value, index, list) =>
      list.findIndex((entry) => entry.toLowerCase() === value.toLowerCase()) === index
  );

  const matchedCareerKeywords = uniqueCareerKeywords.filter((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );

  const sectionChecks = ATS_SECTION_PATTERNS.map((section) => ({
    label: section.label,
    present: section.pattern.test(normalizedText)
  }));

  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(normalizedText);
  const hasPhone = /(\+\d{1,3}[\s-]?)?(\d[\s-]?){10,}/.test(normalizedText);
  const hasLinkedIn = /linkedin\.com/i.test(normalizedText);
  const hasBullets = /(^|\n)\s*[•\-*]/.test(normalizedText);
  const hasDates = /\b(20\d{2}|19\d{2})\b/.test(normalizedText);
  const hasLongLines = lines.some((line) => line.length > 140);
  const specialCharacterCount = (normalizedText.match(/[|<>_\t]/g) || []).length;
  const contactScore = [hasEmail, hasPhone, hasLinkedIn].filter(Boolean).length >= 2 ? 100 : 55;

  const formattingScore = clampScore(
    45 +
      (hasBullets ? 20 : 0) +
      (hasDates ? 15 : 0) +
      (!hasLongLines ? 10 : 0) +
      (specialCharacterCount < 8 ? 10 : -10)
  );

  const sectionScore = clampScore(
    (sectionChecks.filter((item) => item.present).length / ATS_SECTION_PATTERNS.length) * 100
  );

  const keywordCoverageScore = uniqueCareerKeywords.length
    ? clampScore((matchedCareerKeywords.length / uniqueCareerKeywords.length) * 100)
    : 60;

  const contentStrengthScore = clampScore(
    35 +
      (words.length >= 250 ? 20 : words.length >= 140 ? 10 : 0) +
      (skillMatches.length >= 3 ? 20 : skillMatches.length >= 1 ? 10 : 0) +
      (hasDates ? 15 : 0) +
      (hasBullets ? 10 : 0)
  );

  const atsScore = clampScore(
    keywordCoverageScore * 0.35 +
      sectionScore * 0.25 +
      formattingScore * 0.2 +
      contentStrengthScore * 0.12 +
      contactScore * 0.08
  );

  const strengths = [];
  const suggestions = [];

  if (sectionScore >= 80) {
    strengths.push('Core ATS-friendly resume sections are present and readable.');
  } else {
    suggestions.push('Add clear headings for summary, skills, experience, and education to improve ATS parsing.');
  }

  if (keywordCoverageScore >= 70) {
    strengths.push('Your resume includes strong keyword coverage for your current skills and career direction.');
  } else {
    suggestions.push('Increase role-relevant keywords that match your target career and strongest skills.');
  }

  if (formattingScore >= 75) {
    strengths.push('Formatting looks relatively ATS-safe with readable structure and resume-style signals.');
  } else {
    suggestions.push('Use simpler formatting, shorter lines, and standard bullet points to make ATS parsing easier.');
  }

  if (contactScore >= 90) {
    strengths.push('Contact details are easy to detect for ATS screening.');
  } else {
    suggestions.push('Make sure email, phone number, and LinkedIn are visible near the top of the resume.');
  }

  if (contentStrengthScore < 70) {
    suggestions.push('Add stronger experience bullets with outcomes, tools, and measurable work to improve resume quality.');
  }

  if (!strengths.length) {
    strengths.push('Your resume already contains the basic structure needed for a better ATS review.');
  }

  if (!suggestions.length) {
    suggestions.push('Keep tailoring the resume to each role by adjusting keywords and project evidence.');
  }

  return {
    atsScore,
    scoreBreakdown: [
      { label: 'Keyword match', score: keywordCoverageScore },
      { label: 'Section structure', score: sectionScore },
      { label: 'Formatting safety', score: formattingScore },
      { label: 'Content strength', score: contentStrengthScore }
    ],
    strengths: strengths.slice(0, 4),
    suggestions: suggestions.slice(0, 5),
    sectionChecks,
    keywordCoverage: {
      matched: matchedCareerKeywords,
      missing: uniqueCareerKeywords.filter(
        (keyword) =>
          !matchedCareerKeywords.some((matched) => matched.toLowerCase() === keyword.toLowerCase())
      )
    }
  };
}

export async function createRoadmap(req, res) {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });

    if (!profile || !profile.targetCareer) {
      return res.status(400).json({ message: 'Complete the student onboarding flow before generating a roadmap.' });
    }

    const roadmapResult = await generateRoadmap(profile.toObject());
    const roadmap = await Roadmap.findOneAndUpdate(
      { studentProfileId: profile._id },
      {
        studentProfileId: profile._id,
        targetRole: profile.targetCareer,
        summary: roadmapResult.data.summary,
        currentStrengths: roadmapResult.data.currentStrengths,
        missingSkills: roadmapResult.data.missingSkills,
        recommendedNextSteps: roadmapResult.data.recommendedNextSteps,
        beginnerProject: roadmapResult.data.beginnerProject,
        intermediateProject: roadmapResult.data.intermediateProject,
        learningRoadmap: roadmapResult.data.learningRoadmap,
        milestones: roadmapResult.data.milestones || []
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    profile.roadmapSummary = roadmap.summary;
    profile.roadmapSnapshot = {
      currentStrengths: roadmap.currentStrengths,
      missingSkills: roadmap.missingSkills,
      recommendedNextSteps: roadmap.recommendedNextSteps,
      beginnerProject: roadmap.beginnerProject,
      intermediateProject: roadmap.intermediateProject,
      learningRoadmap: roadmap.learningRoadmap
    };
    profile.latestRoadmapMilestones = roadmap.milestones || [];
    await profile.save();

    return res.json({ roadmap, aiStatus: roadmapResult.meta });
  } catch (error) {
    console.error('Roadmap generation failed:', error.message);
    return res.status(500).json({ message: 'Unable to generate roadmap.' });
  }
}

export async function listTaskCategories(req, res) {
  const profile = await StudentProfile.findOne({ userId: req.user._id }).lean();
  const requestedSkill = String(req.query?.skill || '').trim();
  const studentRoadmap = profile
    ? await Roadmap.findOne({ studentProfileId: profile._id }).lean()
    : null;
  const deterministicTasks = listTaskPrompts(profile || {}, studentRoadmap || null);
  const onboardingSkills = (profile?.currentSkills || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  const suggestedSkills = [
    ...onboardingSkills,
    ...deterministicTasks.map((task) => task.displaySkillCategory || task.skillCategory),
    profile?.targetCareer || ''
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, list) => list.findIndex((entry) => entry.toLowerCase() === item.toLowerCase()) === index);

  let selectedSkill = requestedSkill || suggestedSkills[0] || '';
  let task = null;
  let aiMeta = null;

  if (!selectedSkill && profile?.targetCareer) {
    selectedSkill = profile.targetCareer;
  }

  if (selectedSkill) {
    const generatedTask = await generateSkillTaskPrompt(profile || {}, selectedSkill);
    task = generatedTask.data;
    aiMeta = generatedTask.meta;
  }

  return res.json({
    selectedSkill,
    suggestedSkills,
    task,
    aiStatus: aiMeta
  });
}

export async function refineStudentRoadmap(req, res) {
  try {
    const userMessage = String(req.body?.userMessage || '').trim();

    if (!userMessage) {
      return res.status(400).json({ message: 'A roadmap update message is required.' });
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile || !profile.targetCareer) {
      return res.status(400).json({ message: 'Complete onboarding before editing your roadmap.' });
    }

    const existingRoadmap = await Roadmap.findOne({ studentProfileId: profile._id });
    if (!existingRoadmap) {
      return res.status(400).json({ message: 'Generate your roadmap first before refining it.' });
    }

    const refinement = await refineRoadmap(
      profile.toObject(),
      existingRoadmap.toObject(),
      userMessage
    );

    const updatedRoadmap = await Roadmap.findOneAndUpdate(
      { studentProfileId: profile._id },
      {
        studentProfileId: profile._id,
        targetRole: profile.targetCareer,
        summary: refinement.data.roadmap.summary,
        currentStrengths: refinement.data.roadmap.currentStrengths,
        missingSkills: refinement.data.roadmap.missingSkills,
        recommendedNextSteps: refinement.data.roadmap.recommendedNextSteps,
        beginnerProject: refinement.data.roadmap.beginnerProject,
        intermediateProject: refinement.data.roadmap.intermediateProject,
        learningRoadmap: refinement.data.roadmap.learningRoadmap,
        milestones: refinement.data.roadmap.milestones || []
      },
      { new: true }
    );

    profile.roadmapSummary = updatedRoadmap.summary;
    profile.roadmapSnapshot = {
      currentStrengths: updatedRoadmap.currentStrengths,
      missingSkills: updatedRoadmap.missingSkills,
      recommendedNextSteps: updatedRoadmap.recommendedNextSteps,
      beginnerProject: updatedRoadmap.beginnerProject,
      intermediateProject: updatedRoadmap.intermediateProject,
      learningRoadmap: updatedRoadmap.learningRoadmap
    };
    profile.latestRoadmapMilestones = updatedRoadmap.milestones || [];
    await profile.save();

    return res.json({
      roadmap: updatedRoadmap,
      assistantReply: refinement.data.assistantReply,
      aiStatus: refinement.meta
    });
  } catch (error) {
    console.error('Roadmap refinement failed:', error.message);
    return res.status(500).json({ message: 'Unable to update roadmap right now.' });
  }
}

export async function submitSkillTask(req, res) {
  try {
    const { skillCategory, taskPrompt, userSubmission } = req.body;

    if (!skillCategory || !taskPrompt || !userSubmission) {
      return res.status(400).json({ message: 'Skill, task prompt, and submission are required.' });
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const evaluation = await evaluateSkillSubmission(
      {
        skillCategory: String(skillCategory).trim(),
        taskPrompt: String(taskPrompt).trim(),
        userSubmission
      },
      profile.toObject()
    );

    const submission = await SkillTaskSubmission.create({
      studentProfileId: profile._id,
      skillCategory: String(skillCategory).trim(),
      taskPrompt: String(taskPrompt).trim(),
      userSubmission,
      aiScore: evaluation.data.score,
      strengths: evaluation.data.strengths || [],
      weaknesses: evaluation.data.weaknesses || [],
      suggestions: evaluation.data.suggestions || []
    });

    profile.overallSkillScore =
      Math.round((profile.overallSkillScore + evaluation.data.score) / 2) || evaluation.data.score;
    await profile.save();

    const jobPostings = await JobPosting.find().lean();
    await Promise.all(
      jobPostings.map(async (jobPosting) => {
        const match = calculateCandidateMatch(profile.toObject(), jobPosting, evaluation.data.score);
        await CandidateMatch.findOneAndUpdate(
          {
            studentProfileId: profile._id,
            jobPostingId: jobPosting._id
          },
          {
            fitScore: match.fitScore,
            explanation: match.explanation
          },
          { upsert: true, new: true }
        );
      })
    );

    return res.json({ submission, aiStatus: evaluation.meta });
  } catch {
    return res.status(500).json({ message: 'Unable to evaluate skill task submission.' });
  }
}

export async function compareResumeWithSkills(req, res) {
  let resumeText = '';
  let uploadedResumeResponse = null;
  let profile = await StudentProfile.findOne({ userId: req.user._id });

  if (req.file?.buffer) {
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF resumes are supported for upload.' });
    }

    try {
      const parser = new PDFParse({ data: req.file.buffer });
      const parsedPdf = await parser.getText();
      await parser.destroy();
      resumeText = String(parsedPdf.text || '').trim();

      const uploadedResume = {
        fileName: String(req.file.originalname || 'resume.pdf').trim(),
        mimeType: String(req.file.mimetype || 'application/pdf').trim(),
        dataBase64: req.file.buffer.toString('base64'),
        extractedText: resumeText,
        uploadedAt: new Date()
      };

      profile = await StudentProfile.findOneAndUpdate(
        { userId: req.user._id },
        { uploadedResume },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      uploadedResumeResponse = {
        fileName: profile.uploadedResume.fileName,
        mimeType: profile.uploadedResume.mimeType,
        uploadedAt: profile.uploadedResume.uploadedAt
      };
    } catch {
      return res.status(400).json({ message: 'Unable to read that PDF. Please try another file or paste the text.' });
    }
  } else {
    if (!profile?.uploadedResume?.dataBase64) {
      return res.status(400).json({ message: 'Upload a PDF resume in onboarding or here to run the ATS check.' });
    }

    if (profile.uploadedResume.mimeType !== 'application/pdf') {
      return res.status(400).json({
        message: 'Your saved resume is not a PDF. Upload a PDF here to run the ATS check.'
      });
    }

    resumeText = String(profile.uploadedResume.extractedText || '').trim();

    if (!resumeText) {
      try {
        const parser = new PDFParse({
          data: Buffer.from(profile.uploadedResume.dataBase64, 'base64')
        });
        const parsedPdf = await parser.getText();
        await parser.destroy();
        resumeText = String(parsedPdf.text || '').trim();

        profile.uploadedResume.extractedText = resumeText;
        await profile.save();
      } catch {
        return res.status(400).json({
          message: 'Unable to read your saved resume. Please upload the PDF again.'
        });
      }
    }

    uploadedResumeResponse = {
      fileName: profile.uploadedResume.fileName || 'resume.pdf',
      mimeType: profile.uploadedResume.mimeType || 'application/pdf',
      uploadedAt: profile.uploadedResume.uploadedAt || null
    };
  }

  if (!looksLikeMeaningfulResume(resumeText)) {
    return res.status(400).json({
      message: 'That PDF does not look like a real resume yet. Please upload a proper resume PDF with meaningful content.'
    });
  }

  profile = await StudentProfile.findOne({ userId: req.user._id }).lean();
  if (!profile) {
    return res.status(404).json({ message: 'Student profile not found.' });
  }

  const claimedSkills = extractClaimedSkills(resumeText);
  const verifiedSkills = (profile.currentSkills || []).slice(0, 5);
  const deterministicAtsAnalysis = analyzeResumeForAts(resumeText, profile);
  const atsAnalysisResult = await generateResumeAtsAnalysis({
    profile: profile.toObject ? profile.toObject() : profile,
    resumeText,
    fallback: {
      atsScore: deterministicAtsAnalysis.atsScore,
      scoreBreakdown: deterministicAtsAnalysis.scoreBreakdown,
      strengths: deterministicAtsAnalysis.strengths,
      suggestions: deterministicAtsAnalysis.suggestions,
      sectionChecks: deterministicAtsAnalysis.sectionChecks,
      keywordCoverage: deterministicAtsAnalysis.keywordCoverage,
      summary: `ATS review completed for ${profile.targetCareer || 'the selected target career'}.`
    }
  });
  const atsAnalysis = atsAnalysisResult.data;
  const alignmentScore = profile.overallSkillScore || 0;
  const mismatchSummary =
    alignmentScore >= 80
      ? 'Resume claims broadly align with your verified skill evidence.'
      : 'Your resume currently sounds stronger than the verified task evidence in your profile.';

  return res.json({
    atsScore: atsAnalysis.atsScore,
    scoreBreakdown: atsAnalysis.scoreBreakdown,
    atsStrengths: atsAnalysis.strengths,
    atsSuggestions: atsAnalysis.suggestions,
    sectionChecks: atsAnalysis.sectionChecks,
    keywordCoverage: atsAnalysis.keywordCoverage,
    atsSummary: atsAnalysis.summary,
    profileSkillScore: alignmentScore,
    claimedSkills,
    verifiedSkills,
    mismatchSummary,
    extractedResumeText: resumeText.slice(0, 2000),
    uploadedResume: uploadedResumeResponse
  });
}

export async function getUploadedResume(req, res) {
  const profile = await StudentProfile.findOne({ userId: req.user._id }).lean();

  if (!profile?.uploadedResume?.dataBase64) {
    return res.status(404).json({ message: 'No uploaded resume found yet.' });
  }

  return res.json({
    fileName: profile.uploadedResume.fileName || 'resume.pdf',
    mimeType: profile.uploadedResume.mimeType || 'application/pdf',
    uploadedAt: profile.uploadedResume.uploadedAt || null,
    dataUrl: `data:${profile.uploadedResume.mimeType || 'application/pdf'};base64,${profile.uploadedResume.dataBase64}`
  });
}

export async function startMockInterview(req, res) {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id }).lean();
    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const questions = await generateInterviewQuestions(profile);
    return res.json({ questions: questions.data, aiStatus: questions.meta });
  } catch (error) {
    console.error('Mock interview question generation failed:', error.message);
    return res.status(500).json({ message: 'Unable to load interview questions.' });
  }
}

export async function evaluateMockInterview(req, res) {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length !== 3 || answers.some((answer) => !String(answer || '').trim())) {
      return res.status(400).json({ message: 'Three interview answers are required.' });
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id }).lean();
    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const evaluation = await evaluateInterviewAnswers(profile, answers);
    return res.json({ evaluation: evaluation.data, aiStatus: evaluation.meta });
  } catch (error) {
    console.error('Mock interview evaluation failed:', error.message);
    return res.status(500).json({ message: 'Unable to evaluate interview answers.' });
  }
}

export async function getAiRuntimeStatus(req, res) {
  const aiStatus = await getVerifiedAiStatus(true);
  return res.json({ aiStatus });
}
