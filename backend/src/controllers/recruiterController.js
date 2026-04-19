import { CandidateMatch, JobPosting, SkillTaskSubmission, StudentProfile } from '../models/index.js';
import { anonymizeCandidate } from '../utils/profile.js';
import { calculateCandidateMatch } from '../services/matchService.js';
import { generateRecruiterFitSummary } from '../services/aiService.js';

const DEFAULT_REVIEW_JOB_TITLE = 'General Talent Review';

async function getOrCreateRecruiterReviewJob(recruiterId) {
  let recruiterJob = await JobPosting.findOne({ recruiterId }).lean();

  if (!recruiterJob) {
    recruiterJob = await JobPosting.create({
      recruiterId,
      title: 'General Talent Review',
      requiredSkills: ['Communication', 'Problem Solving', 'Adaptability'],
      description: 'Default review role created automatically so recruiters can shortlist and discard candidates.'
    });
    return recruiterJob.toObject();
  }

  return recruiterJob;
}

function resolveMatchedRoleTitle({ matchedJobTitle = '', targetCareer = '' } = {}) {
  const safeMatchedJobTitle = String(matchedJobTitle || '').trim();
  const safeTargetCareer = String(targetCareer || '').trim();

  if (safeMatchedJobTitle && safeMatchedJobTitle !== DEFAULT_REVIEW_JOB_TITLE) {
    return safeMatchedJobTitle;
  }

  if (safeTargetCareer) {
    return safeTargetCareer;
  }

  return safeMatchedJobTitle || 'Not mapped yet';
}

async function buildRecruiterCandidateSnapshot(recruiterId, { minimumScore = 0, targetCareer = '' } = {}) {
  const profiles = await StudentProfile.find()
    .populate('userId', 'name email')
    .sort({ updatedAt: -1 })
    .lean();
  const profileIds = profiles.map((profile) => profile._id);

  let [submissions, matches, jobPostings] = await Promise.all([
    SkillTaskSubmission.find({ studentProfileId: { $in: profileIds } }).sort({ createdAt: -1 }).lean(),
    CandidateMatch.find({ studentProfileId: { $in: profileIds } }).lean(),
    JobPosting.find({ recruiterId }).lean()
  ]);

  if (!jobPostings.length) {
    jobPostings = [await getOrCreateRecruiterReviewJob(recruiterId)];
  }
  const recruiterJobIds = new Set(jobPostings.map((job) => job._id.toString()));

  const candidateRecords = profiles
    .map((profile, index) => {
      const relatedSubmissions = submissions.filter(
        (submission) => submission.studentProfileId.toString() === profile._id.toString()
      );
      const relatedMatches = matches.filter(
        (match) =>
          match.studentProfileId.toString() === profile._id.toString() &&
          recruiterJobIds.has(match.jobPostingId.toString())
      );
      const strongestMatch = [...relatedMatches].sort((a, b) => b.fitScore - a.fitScore)[0];
      const mostRecentDecisionMatch = [...relatedMatches]
        .filter((match) => match.recruiterDecision && match.recruiterDecision !== 'new')
        .sort(
          (a, b) =>
            new Date(b.decisionUpdatedAt || b.updatedAt || 0).getTime() -
            new Date(a.decisionUpdatedAt || a.updatedAt || 0).getTime()
        )[0];
      const topSubmission = relatedSubmissions[0];
      const fallbackJob = jobPostings[0];
      const fallbackMatch = fallbackJob
        ? calculateCandidateMatch(profile, fallbackJob, topSubmission?.aiScore || profile.overallSkillScore || 0)
        : null;
      const strongestMatchJobTitle = strongestMatch
        ? jobPostings.find((job) => job._id.toString() === strongestMatch.jobPostingId.toString())?.title || ''
        : '';
      const recruiterDecision =
        mostRecentDecisionMatch?.recruiterDecision || strongestMatch?.recruiterDecision || 'new';
      const revealIdentity = recruiterDecision === 'shortlisted';
      const uploadedResume =
        revealIdentity && profile.uploadedResume?.dataBase64
          ? {
              fileName: profile.uploadedResume.fileName || '',
              mimeType: profile.uploadedResume.mimeType || '',
              dataBase64: profile.uploadedResume.dataBase64 || '',
              uploadedAt: profile.uploadedResume.uploadedAt || null
            }
          : null;

      return {
        ...anonymizeCandidate(profile, index, relatedSubmissions, {
          revealIdentity,
          user: profile.userId
        }),
        currentSkills: profile.currentSkills || [],
        targetCareer: profile.targetCareer,
        strengthsSummary: topSubmission?.strengths?.slice(0, 2).join(' | ') || 'No verified strengths available yet.',
        verifiedTaskScore: topSubmission?.aiScore || profile.overallSkillScore || 0,
        fitScore: strongestMatch?.fitScore || fallbackMatch?.fitScore || 0,
        fitExplanation: strongestMatch?.explanation || fallbackMatch?.explanation || 'No fit score calculated yet.',
        recruiterDecision,
        matchedRole: resolveMatchedRoleTitle({
          matchedJobTitle: strongestMatchJobTitle || fallbackJob?.title || '',
          targetCareer: profile.targetCareer
        }),
        uploadedResume,
        fitScores: relatedMatches.map((match) => ({
          jobPostingId: match.jobPostingId.toString(),
          fitScore: match.fitScore,
          explanation: match.explanation,
          recruiterDecision: match.recruiterDecision || 'new'
        }))
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  const candidates = candidateRecords
    .filter((candidate) => candidate.verifiedTaskScore >= minimumScore)
    .filter((candidate) => !targetCareer || String(candidate.targetCareer || '').toLowerCase().includes(targetCareer))
    .filter((candidate) => candidate.recruiterDecision === 'new');

  const shortlistedCandidates = candidateRecords
    .filter((candidate) => candidate.verifiedTaskScore >= minimumScore)
    .filter((candidate) => !targetCareer || String(candidate.targetCareer || '').toLowerCase().includes(targetCareer))
    .filter((candidate) => candidate.recruiterDecision === 'shortlisted');

  const discardedCount = candidateRecords.filter((candidate) => candidate.recruiterDecision === 'discarded').length;

  return {
    candidates,
    shortlistedCandidates,
    availableTargetCareers: [...new Set(profiles.map((profile) => profile.targetCareer).filter(Boolean))],
    summary: {
      shortlisted: shortlistedCandidates.length,
      discarded: discardedCount,
      active: candidateRecords.filter((candidate) => candidate.recruiterDecision === 'new').length
    }
  };
}

export async function listCandidates(req, res) {
  const parsedMinimumScore = Number(req.query.minimumScore);
  const minimumScore = Number.isFinite(parsedMinimumScore) && parsedMinimumScore > 0 ? parsedMinimumScore : 0;
  const targetCareer = String(req.query.targetCareer || '').trim().toLowerCase();

  const snapshot = await buildRecruiterCandidateSnapshot(req.user._id, {
    minimumScore,
    targetCareer
  });

  return res.json(snapshot);
}

export async function getCandidateBrief(req, res) {
  const { studentProfileId } = req.params;
  const profile = await StudentProfile.findById(studentProfileId).populate('userId', 'name email').lean();

  if (!profile) {
    return res.status(404).json({ message: 'Candidate match not found.' });
  }

  let recruiterJobs = await JobPosting.find({ recruiterId: req.user._id }).lean();
  if (!recruiterJobs.length) {
    recruiterJobs = [await getOrCreateRecruiterReviewJob(req.user._id)];
  }

  const recruiterJobIds = new Set(recruiterJobs.map((job) => job._id.toString()));

  const [submissions, matches] = await Promise.all([
    SkillTaskSubmission.find({ studentProfileId }).sort({ createdAt: -1 }).lean(),
    CandidateMatch.find({ studentProfileId }).lean()
  ]);

  const relatedMatches = matches.filter((match) => recruiterJobIds.has(match.jobPostingId.toString()));
  const strongestMatch = [...relatedMatches].sort((a, b) => b.fitScore - a.fitScore)[0];
  const matchedRole = resolveMatchedRoleTitle({
    matchedJobTitle: strongestMatch
      ? recruiterJobs.find((job) => job._id.toString() === strongestMatch.jobPostingId.toString())?.title || ''
      : recruiterJobs[0]?.title || '',
    targetCareer: profile.targetCareer
  });
  const verifiedTaskScore = submissions[0]?.aiScore || profile.overallSkillScore || 0;
  const fallbackSummary = strongestMatch?.explanation || '';
  const fitSummary = await generateRecruiterFitSummary({
    profile,
    matchedRole,
    verifiedTaskScore,
    fallbackSummary
  });

  return res.json({
    currentSkills: profile.currentSkills || [],
    targetCareer: profile.targetCareer || '',
    matchedRole,
    aiFitSummary: fitSummary.data.summary,
    aiStatus: fitSummary.meta
  });
}

export async function updateCandidateDecision(req, res) {
  const { studentProfileId } = req.params;
  const { decision } = req.body;

  if (!['new', 'shortlisted', 'discarded'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be new, shortlisted, or discarded.' });
  }

  let recruiterJobs = await JobPosting.find({ recruiterId: req.user._id }).select('_id').lean();
  if (!recruiterJobs.length) {
    const defaultJob = await getOrCreateRecruiterReviewJob(req.user._id);
    recruiterJobs = [{ _id: defaultJob._id }];
  }
  const jobIds = recruiterJobs.map((job) => job._id);

  let candidateMatch = await CandidateMatch.findOne({
    studentProfileId,
    jobPostingId: { $in: jobIds }
  }).sort({ fitScore: -1 });

  if (!candidateMatch) {
    const [profile, strongestSubmission, recruiterJob] = await Promise.all([
      StudentProfile.findById(studentProfileId).lean(),
      SkillTaskSubmission.findOne({ studentProfileId }).sort({ createdAt: -1 }).lean(),
      getOrCreateRecruiterReviewJob(req.user._id)
    ]);

    if (!profile || !recruiterJob) {
      return res.status(404).json({ message: 'Candidate could not be updated right now.' });
    }

    const generatedMatch = calculateCandidateMatch(
      profile,
      recruiterJob,
      strongestSubmission?.aiScore || profile.overallSkillScore || 0
    );

    candidateMatch = await CandidateMatch.create({
      studentProfileId,
      jobPostingId: recruiterJob._id,
      fitScore: generatedMatch.fitScore,
      explanation: generatedMatch.explanation,
      recruiterDecision: 'new'
    });
  }

  const decisionUpdatedAt = new Date();

  await CandidateMatch.updateMany(
    {
      studentProfileId,
      jobPostingId: { $in: jobIds }
    },
    {
      $set: {
        recruiterDecision: decision,
        decisionUpdatedAt
      }
    }
  );

  candidateMatch.recruiterDecision = decision;
  candidateMatch.decisionUpdatedAt = decisionUpdatedAt;

  const snapshot = await buildRecruiterCandidateSnapshot(req.user._id);

  return res.json({
    message: 'Candidate decision saved.',
    decision: candidateMatch.recruiterDecision,
    studentProfileId,
    ...snapshot
  });
}
