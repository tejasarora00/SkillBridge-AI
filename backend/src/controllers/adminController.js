import {
  CandidateMatch,
  ExpertSessionRequest,
  JobPosting,
  Roadmap,
  SkillTaskSubmission,
  StudentProfile,
  User
} from '../models/index.js';
import { generateExpertSessionEmailDraft } from '../services/aiService.js';
import { createAdminToken } from '../utils/jwt.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@817';

export async function adminLogin(req, res) {
  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ message: 'Admin password is required.' });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid admin password.' });
  }

  return res.json({
    token: createAdminToken(),
    user: {
      id: 'admin',
      name: 'SkillBridge Admin',
      email: 'admin@skillbridge.local',
      role: 'admin'
    }
  });
}

export async function getAdminOverview(req, res) {
  const [students, recruiters, recruiterJobs, shortlistedMatches, expertSessionRequests] = await Promise.all([
    User.find({ role: 'student' }).sort({ createdAt: -1 }).lean(),
    User.find({ role: 'recruiter' }).sort({ createdAt: -1 }).lean(),
    JobPosting.find().sort({ createdAt: -1 }).lean(),
    CandidateMatch.find({ recruiterDecision: 'shortlisted' }).sort({ decisionUpdatedAt: -1, updatedAt: -1 }).lean(),
    ExpertSessionRequest.find().sort({ createdAt: -1 }).lean()
  ]);

  const studentIds = students.map((student) => student._id);
  const profiles = await StudentProfile.find({ userId: { $in: studentIds } }).lean();
  const profilesByUserId = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));
  const profilesById = new Map(profiles.map((profile) => [profile._id.toString(), profile]));
  const studentsById = new Map(students.map((student) => [student._id.toString(), student]));
  const recruitersById = new Map(recruiters.map((recruiter) => [recruiter._id.toString(), recruiter]));
  const jobsById = new Map(recruiterJobs.map((job) => [job._id.toString(), job]));

  const jobsByRecruiterId = recruiterJobs.reduce((accumulator, job) => {
    const recruiterId = job.recruiterId.toString();

    if (!accumulator.has(recruiterId)) {
      accumulator.set(recruiterId, []);
    }

    accumulator.get(recruiterId).push({
      id: job._id.toString(),
      title: job.title,
      requiredSkills: job.requiredSkills || [],
      createdAt: job.createdAt
    });

    return accumulator;
  }, new Map());

  return res.json({
    summary: {
      students: students.length,
      recruiters: recruiters.length,
      jobPostings: recruiterJobs.length,
      expertSessionRequests: expertSessionRequests.length
    },
    students: students.map((student) => {
      const profile = profilesByUserId.get(student._id.toString());

      return {
        id: student._id.toString(),
        name: student.name,
        email: student.email,
        role: student.role,
        joinedAt: student.createdAt,
        targetCareer: profile?.targetCareer || '',
        educationLevel: profile?.educationLevel || '',
        profileCompleteness: profile?.profileCompleteness || 0,
        currentSkills: profile?.currentSkills || [],
        interests: profile?.interests || []
      };
    }),
    recruiters: recruiters.map((recruiter) => ({
      id: recruiter._id.toString(),
      name: recruiter.name,
      email: recruiter.email,
      role: recruiter.role,
      joinedAt: recruiter.createdAt,
      openRoles: jobsByRecruiterId.get(recruiter._id.toString()) || []
    })),
    recruiterContacts: recruiters.map((recruiter) => ({
      id: recruiter._id.toString(),
      name: recruiter.name,
      email: recruiter.email
    })),
    shortlistedCandidates: shortlistedMatches
      .map((match) => {
        const profile = profilesById.get(match.studentProfileId.toString());
        const student = profile ? studentsById.get(profile.userId.toString()) : null;
        const job = jobsById.get(match.jobPostingId.toString());
        const recruiter = job ? recruitersById.get(job.recruiterId.toString()) : null;

        if (!profile || !student || !job || !recruiter) {
          return null;
        }

        return {
          id: match._id.toString(),
          candidateName: student.name,
          candidateEmail: student.email,
          targetCareer: profile.targetCareer || '',
          recruiterName: recruiter.name,
          recruiterEmail: recruiter.email,
          jobTitle: job.title,
          fitScore: match.fitScore || 0,
          shortlistedAt: match.decisionUpdatedAt || match.updatedAt || match.createdAt
        };
      })
      .filter(Boolean),
    expertSessionRequests: expertSessionRequests.map((request) => ({
      id: request._id.toString(),
      studentUserId: request.studentUserId.toString(),
      name: request.name,
      phone: request.phone,
      email: request.email,
      message: request.message,
      slotLabel: request.slotLabel,
      slotStart: request.slotStart,
      slotEnd: request.slotEnd,
      status: request.status,
      createdAt: request.createdAt
    })),
    studentContacts: students.map((student) => ({
      id: student._id.toString(),
      name: student.name,
      email: student.email
    }))
  });
}

export async function deleteAdminManagedUser(req, res) {
  const { userId } = req.params;

  const user = await User.findById(userId).lean();

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (user.role === 'student') {
    const profile = await StudentProfile.findOne({ userId: user._id }).lean();

    if (profile) {
      await Promise.all([
        Roadmap.deleteMany({ studentProfileId: profile._id }),
        SkillTaskSubmission.deleteMany({ studentProfileId: profile._id }),
        CandidateMatch.deleteMany({ studentProfileId: profile._id }),
        StudentProfile.deleteOne({ _id: profile._id })
      ]);
    }

    await ExpertSessionRequest.deleteMany({ studentUserId: user._id });

    await User.deleteOne({ _id: user._id });

    return res.json({
      message: 'Student deleted successfully.',
      deletedUserId: userId,
      deletedRole: user.role
    });
  }

  if (user.role === 'recruiter') {
    const recruiterJobs = await JobPosting.find({ recruiterId: user._id }).select('_id').lean();
    const recruiterJobIds = recruiterJobs.map((job) => job._id);

    await Promise.all([
      recruiterJobIds.length ? CandidateMatch.deleteMany({ jobPostingId: { $in: recruiterJobIds } }) : null,
      JobPosting.deleteMany({ recruiterId: user._id }),
      User.deleteOne({ _id: user._id })
    ]);

    return res.json({
      message: 'Recruiter deleted successfully.',
      deletedUserId: userId,
      deletedRole: user.role
    });
  }

  return res.status(400).json({ message: 'Only student and recruiter accounts can be deleted.' });
}

export async function createExpertSessionEmailDraft(req, res) {
  const { requestId } = req.params;
  const expertEmail = String(req.body?.expertEmail || '').trim().toLowerCase();

  if (!expertEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expertEmail)) {
    return res.status(400).json({ message: 'A valid expert email is required.' });
  }

  const request = await ExpertSessionRequest.findById(requestId).lean();
  if (!request) {
    return res.status(404).json({ message: 'Expert session request not found.' });
  }

  const [student, studentProfile] = await Promise.all([
    User.findById(request.studentUserId).lean(),
    StudentProfile.findOne({ userId: request.studentUserId }).lean()
  ]);

  const emailDraft = await generateExpertSessionEmailDraft({
    expertEmail,
    request,
    studentProfile: {
      ...studentProfile,
      fullName: student?.name || request.name,
      email: student?.email || request.email
    }
  });

  return res.json({
    to: expertEmail,
    subject: emailDraft.data.subject,
    body: emailDraft.data.body,
    aiStatus: emailDraft.meta
  });
}

export async function deleteExpertSessionRequest(req, res) {
  const { requestId } = req.params;

  const request = await ExpertSessionRequest.findById(requestId).lean();

  if (!request) {
    return res.status(404).json({ message: 'Expert session request not found.' });
  }

  await ExpertSessionRequest.deleteOne({ _id: request._id });

  return res.json({
    message: 'Expert session request deleted successfully.',
    deletedRequestId: requestId
  });
}
