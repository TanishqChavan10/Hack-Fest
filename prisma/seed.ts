// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Prisma client is generated at build time
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // NOTE: With Supabase Auth, real users are created via supabase.auth.signUp().
  // These seed records are for development/testing only; they won't have
  // matching rows in Supabase's auth.users table.

  // -------------------------------------------------------
  // Seed recruiter
  // -------------------------------------------------------
  const recruiterUser = await prisma.user.upsert({
    where: { email: "recruiter@demo.com" },
    update: {},
    create: {
      email: "recruiter@demo.com",
      name: "Demo Recruiter",
      role: "RECRUITER",
      recruiterProfile: {
        create: {
          companyName: "TechCorp Inc.",
          industry: "Software",
          website: "https://techcorp.example.com",
          description: "We build scalable software solutions.",
        },
      },
    },
    include: { recruiterProfile: true },
  });

  // -------------------------------------------------------
  // Seed candidate
  // -------------------------------------------------------
  const candidateUser = await prisma.user.upsert({
    where: { email: "candidate@demo.com" },
    update: {},
    create: {
      email: "candidate@demo.com",
      name: "Jane Developer",
      role: "CANDIDATE",
      candidateProfile: {
        create: {
          headline: "Full-Stack Developer | React & Node.js",
          bio: "Passionate developer with 4 years of experience building modern web applications.",
          location: "San Francisco, CA",
          yearsOfExp: 4,
          hardSkills: {
            react: 8,
            typescript: 7,
            nodejs: 7,
            postgresql: 6,
            docker: 5,
          },
          softSkills: {
            communication: 8,
            teamwork: 9,
            problemsolving: 8,
          },
        },
      },
    },
    include: { candidateProfile: true },
  });

  // -------------------------------------------------------
  // Seed a sample job
  // -------------------------------------------------------
  const recruiterId = recruiterUser.id;
  if (recruiterId) {
    const existingJob = await prisma.job.findFirst({
      where: { recruiterId, title: "Senior Full-Stack Engineer" },
    });

    if (!existingJob) {
      await prisma.job.create({
        data: {
          recruiterId,
          title: "Senior Full-Stack Engineer",
          description:
            "We are looking for a senior full-stack engineer to join our growing team. You will be responsible for building scalable web applications using React and Node.js.",
          location: "Remote",
          experienceLevel: "SENIOR",
          salaryMin: 120000,
          salaryMax: 160000,
          status: "PUBLISHED",
          categoryWeights: {
            hardSkill: 0.5,
            softSkill: 0.3,
            experience: 0.2,
          },
          requirements: {
            create: [
              { skillName: "react", minLevel: 7, weight: 0.3, isMandatory: true },
              { skillName: "typescript", minLevel: 6, weight: 0.25, isMandatory: true },
              { skillName: "nodejs", minLevel: 6, weight: 0.25, isMandatory: false },
              { skillName: "postgresql", minLevel: 5, weight: 0.2, isMandatory: false },
              { skillName: "communication", minLevel: 7, weight: 0.5, isMandatory: false },
              { skillName: "teamwork", minLevel: 7, weight: 0.5, isMandatory: false },
            ],
          },
        },
      });
    }
  }

  console.log("✅ Seed complete.");
  console.log("   Recruiter: recruiter@demo.com / Password123!");
  console.log("   Candidate: candidate@demo.com / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
