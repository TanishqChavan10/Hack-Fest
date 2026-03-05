// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Prisma client is generated at build time
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {

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
      email: "admin@talentmatch.com",
      name: "Platform Admin",
      role: "ADMIN",

    },
  });

  // ===========================================================
  // 2. RECRUITERS (3 companies)
  // ===========================================================
  const recruiter1 = await prisma.user.upsert({
    where: { email: "recruiter@techcorp.com" },
    update: {},
    create: {
      email: "recruiter@techcorp.com",
      name: "Priya Sharma",
      role: "RECRUITER",
      recruiterProfile: {
        create: {
          companyName: "TechCorp India",
          industry: "Software Development",
          companySize: "201-500",
          website: "https://techcorp.in",
          location: "Mumbai, India",
          description:
            "Leading enterprise software company building cloud-native solutions for Fortune 500 clients.",
          isVerified: true,
        },
      },
    },
    include: { recruiterProfile: true },
  });

  const recruiter2 = await prisma.user.upsert({
    where: { email: "recruiter@startuphub.com" },
    update: {},
    create: {
      email: "recruiter@startuphub.com",
      name: "Raj Patel",
      role: "RECRUITER",
      recruiterProfile: {
        create: {
          companyName: "StartupHub",
          industry: "FinTech",
          companySize: "11-50",
          website: "https://startuphub.io",
          location: "Bangalore, India",
          description:
            "Fast-growing fintech startup disrupting digital payments across Southeast Asia.",
          isVerified: true,
        },
      },
    },
    include: { recruiterProfile: true },
  });

  const recruiter3 = await prisma.user.upsert({
    where: { email: "recruiter@dataworks.com" },
    update: {},
    create: {
      email: "recruiter@dataworks.com",
      name: "Meera Krishnan",
      role: "RECRUITER",

      recruiterProfile: {
        create: {
          companyName: "DataWorks AI",
          industry: "Artificial Intelligence",
          companySize: "51-200",
          website: "https://dataworks.ai",
          location: "Pune, India",
          description:
            "AI-first company specializing in NLP and computer vision solutions for healthcare.",
          isVerified: true,
        },
      },
    },
    include: { recruiterProfile: true },
  });

  // ===========================================================
  // 3. CANDIDATES (10 diverse profiles)
  // ===========================================================
  const candidates = [
    {
      email: "rahul.dev@demo.com",
      name: "Rahul Verma",
      headline: "Full-Stack Developer | React & Node.js",
      bio: "4 years building production web apps. Open-source contributor. Love TypeScript and clean architecture.",
      location: "Mumbai, India",
      githubUsername: "rahulverma-dev",
      yearsOfExp: 4,
      experienceLevel: "MID" as const,
      hardSkills: { react: 9, typescript: 8, nodejs: 8, postgresql: 7, docker: 6, aws: 5, graphql: 7, nextjs: 8 },
      softSkills: { communication: 8, teamwork: 9, problemsolving: 8 },
    },
    {
      email: "anita.cloud@demo.com",
      name: "Anita Desai",
      headline: "Cloud & DevOps Engineer | AWS Certified",
      bio: "SRE with 6 years experience. Kubernetes, Terraform, CI/CD pipelines. Strong believer in infrastructure as code.",
      location: "Bangalore, India",
      githubUsername: "anita-cloud",
      yearsOfExp: 6,
      experienceLevel: "SENIOR" as const,
      hardSkills: { aws: 9, kubernetes: 9, docker: 8, terraform: 8, python: 7, linux: 9, jenkins: 7, go: 5 },
      softSkills: { communication: 7, teamwork: 8, problemsolving: 9 },
    },
    {
      email: "vikram.ml@demo.com",
      name: "Vikram Singh",
      headline: "ML Engineer | NLP & Computer Vision",
      bio: "Research-focused ML engineer with publications in top-tier conferences. Building production AI systems.",
      location: "Pune, India",
      githubUsername: "vikram-ml",
      yearsOfExp: 5,
      experienceLevel: "SENIOR" as const,
      hardSkills: { python: 9, pytorch: 8, tensorflow: 7, pandas: 8, scikit_learn: 8, docker: 6, sql: 6, fastapi: 7 },
      softSkills: { communication: 7, research: 9, problemsolving: 9 },
    },
    {
      email: "sneha.front@demo.com",
      name: "Sneha Rao",
      headline: "Frontend Engineer | React Native & Next.js",
      bio: "Pixel-perfect UI developer. 3 years experience in responsive design, animations, and accessibility.",
      location: "Hyderabad, India",
      githubUsername: "sneha-ui",
      yearsOfExp: 3,
      experienceLevel: "MID" as const,
      hardSkills: { react: 8, nextjs: 7, typescript: 7, css: 9, tailwindcss: 8, figma: 7, reactnative: 6 },
      softSkills: { communication: 9, creativity: 9, teamwork: 8 },
    },
    {
      email: "amit.backend@demo.com",
      name: "Amit Kumar",
      headline: "Backend Engineer | Java & Microservices",
      bio: "Enterprise Java developer with 7 years building scalable microservices and event-driven systems.",
      location: "Chennai, India",
      githubUsername: "amit-java",
      yearsOfExp: 7,
      experienceLevel: "SENIOR" as const,
      hardSkills: { java: 9, spring: 9, kafka: 8, postgresql: 8, redis: 7, docker: 7, kubernetes: 6, mongodb: 6 },
      softSkills: { teamwork: 8, leadership: 7, problemsolving: 8 },
    },
    {
      email: "zara.data@demo.com",
      name: "Zara Khan",
      headline: "Data Engineer | Spark & Airflow",
      bio: "Building data pipelines at scale. Experience with petabyte-scale systems and real-time analytics.",
      location: "Delhi, India",
      githubUsername: "zara-data",
      yearsOfExp: 4,
      experienceLevel: "MID" as const,
      hardSkills: { python: 8, spark: 8, airflow: 7, sql: 8, aws: 7, scala: 5, kafka: 6, dbt: 7 },
      softSkills: { communication: 7, teamwork: 8, problemsolving: 8 },
    },
    {
      email: "rohan.mobile@demo.com",
      name: "Rohan Mehta",
      headline: "Mobile Developer | Flutter & Swift",
      bio: "Cross-platform mobile developer. 5 published apps on both App Store and Play Store.",
      location: "Mumbai, India",
      githubUsername: "rohan-mobile",
      yearsOfExp: 4,
      experienceLevel: "MID" as const,
      hardSkills: { flutter: 9, dart: 8, swift: 7, firebase: 7, typescript: 6, react: 5, kotlin: 5 },
      softSkills: { creativity: 8, communication: 7, teamwork: 7 },
    },
    {
      email: "priya.security@demo.com",
      name: "Priya Nair",
      headline: "Security Engineer | Penetration Testing",
      bio: "Cybersecurity specialist with OSCP and CEH. Experienced in AppSec, cloud security, and DevSecOps.",
      location: "Bangalore, India",
      githubUsername: "priya-sec",
      yearsOfExp: 5,
      experienceLevel: "SENIOR" as const,
      hardSkills: { python: 7, linux: 9, aws: 7, docker: 6, networking: 9, burpsuite: 8, bash: 8 },
      softSkills: { communication: 8, problemsolving: 9, attention_to_detail: 9 },
    },
    {
      email: "karan.intern@demo.com",
      name: "Karan Joshi",
      headline: "Computer Science Student | Aspiring Developer",
      bio: "Final year CS student passionate about web development. Building projects with React and Python.",
      location: "Ahmedabad, India",
      githubUsername: "karan-learns",
      yearsOfExp: 1,
      experienceLevel: "ENTRY" as const,
      hardSkills: { python: 5, react: 4, javascript: 5, html: 6, css: 5, git: 4, sql: 4 },
      softSkills: { communication: 7, teamwork: 8, willingness_to_learn: 9 },
    },
    {
      email: "divya.lead@demo.com",
      name: "Divya Reddy",
      headline: "Engineering Lead | Full-Stack & Architecture",
      bio: "10+ years leading engineering teams. Expert in system design, microservices, and team mentoring.",
      location: "Bangalore, India",
      githubUsername: "divya-architect",
      yearsOfExp: 12,
      experienceLevel: "LEAD" as const,
      hardSkills: { typescript: 9, react: 8, nodejs: 9, postgresql: 8, aws: 8, docker: 8, kubernetes: 7, graphql: 7, redis: 7, system_design: 9 },
      softSkills: { leadership: 9, communication: 9, problemsolving: 9, mentoring: 9 },
    },
  ];

  const createdCandidateIds: string[] = [];

  for (const c of candidates) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        name: c.name,
        role: "CANDIDATE",

        candidateProfile: {
          create: {
            headline: c.headline,
            bio: c.bio,
            location: c.location,
            githubUsername: c.githubUsername,
            yearsOfExp: c.yearsOfExp,
            experienceLevel: c.experienceLevel,
            isOpenToWork: true,
            hardSkills: c.hardSkills,
            softSkills: c.softSkills,
          },
        },
      },
      include: { candidateProfile: true },
    });
    if (user.candidateProfile) createdCandidateIds.push(user.candidateProfile.userId);
  }

  // ===========================================================
  // 4. JOB POSTINGS (5 diverse roles)
  // ===========================================================
  const jobs = [
    {
      recruiterId: recruiter1.id,
      title: "Senior Full-Stack Engineer",
      description:
        "Build and scale our cloud-native platform using React, Node.js, and PostgreSQL. You'll own critical product features end-to-end and mentor junior developers.",
      location: "Mumbai, India",
      isRemote: true,
      salaryMin: 2000000,
      salaryMax: 3500000,
      currency: "INR",
      experienceLevel: "SENIOR" as const,
      status: "PUBLISHED" as const,
      categoryWeights: { technicalSkills: 0.6, softSkills: 0.2, experience: 0.2 },
      requirements: [
        { skillName: "react", minLevel: 7, weight: 0.25, isMandatory: true },
        { skillName: "typescript", minLevel: 6, weight: 0.25, isMandatory: true },
        { skillName: "nodejs", minLevel: 6, weight: 0.2, isMandatory: false },
        { skillName: "postgresql", minLevel: 5, weight: 0.15, isMandatory: false },
        { skillName: "docker", minLevel: 4, weight: 0.15, isMandatory: false },
      ],
    },
    {
      recruiterId: recruiter2.id,
      title: "Frontend Developer (React Native)",
      description:
        "Join our mobile team to build the next-generation fintech app used by millions. Experience with animations and payment integrations preferred.",
      location: "Bangalore, India",
      isRemote: false,
      salaryMin: 1200000,
      salaryMax: 2000000,
      currency: "INR",
      experienceLevel: "MID" as const,
      status: "PUBLISHED" as const,
      categoryWeights: { technicalSkills: 0.7, softSkills: 0.15, experience: 0.15 },
      requirements: [
        { skillName: "react", minLevel: 6, weight: 0.3, isMandatory: true },
        { skillName: "reactnative", minLevel: 5, weight: 0.3, isMandatory: true },
        { skillName: "typescript", minLevel: 5, weight: 0.2, isMandatory: false },
        { skillName: "css", minLevel: 5, weight: 0.1, isMandatory: false },
        { skillName: "firebase", minLevel: 4, weight: 0.1, isMandatory: false },
      ],
    },
    {
      recruiterId: recruiter3.id,
      title: "Machine Learning Engineer",
      description:
        "Research and deploy NLP models for clinical text analysis. Strong foundation in PyTorch and transformers required.",
      location: "Pune, India",
      isRemote: true,
      salaryMin: 2500000,
      salaryMax: 4000000,
      currency: "INR",
      experienceLevel: "SENIOR" as const,
      status: "PUBLISHED" as const,
      categoryWeights: { technicalSkills: 0.7, softSkills: 0.1, experience: 0.2 },
      requirements: [
        { skillName: "python", minLevel: 8, weight: 0.3, isMandatory: true },
        { skillName: "pytorch", minLevel: 6, weight: 0.25, isMandatory: true },
        { skillName: "tensorflow", minLevel: 5, weight: 0.15, isMandatory: false },
        { skillName: "docker", minLevel: 4, weight: 0.15, isMandatory: false },
        { skillName: "sql", minLevel: 4, weight: 0.15, isMandatory: false },
      ],
    },
    {
      recruiterId: recruiter1.id,
      title: "DevOps / SRE Engineer",
      description:
        "Manage our Kubernetes clusters, CI/CD pipelines, and cloud infrastructure on AWS. On-call rotation required.",
      location: "Remote",
      isRemote: true,
      salaryMin: 1800000,
      salaryMax: 3000000,
      currency: "INR",
      experienceLevel: "MID" as const,
      status: "PUBLISHED" as const,
      categoryWeights: { technicalSkills: 0.6, softSkills: 0.15, experience: 0.25 },
      requirements: [
        { skillName: "aws", minLevel: 7, weight: 0.25, isMandatory: true },
        { skillName: "kubernetes", minLevel: 6, weight: 0.25, isMandatory: true },
        { skillName: "docker", minLevel: 6, weight: 0.2, isMandatory: false },
        { skillName: "terraform", minLevel: 5, weight: 0.15, isMandatory: false },
        { skillName: "linux", minLevel: 6, weight: 0.15, isMandatory: false },
      ],
    },
    {
      recruiterId: recruiter2.id,
      title: "Junior Web Developer (Internship)",
      description:
        "6-month internship for fresh graduates. Learn modern web development with React, Next.js, and build real features shipped to production.",
      location: "Bangalore, India",
      isRemote: false,
      salaryMin: 300000,
      salaryMax: 500000,
      currency: "INR",
      experienceLevel: "ENTRY" as const,
      status: "PUBLISHED" as const,
      categoryWeights: { technicalSkills: 0.5, softSkills: 0.3, experience: 0.2 },
      requirements: [
        { skillName: "javascript", minLevel: 3, weight: 0.3, isMandatory: true },
        { skillName: "react", minLevel: 2, weight: 0.25, isMandatory: false },
        { skillName: "html", minLevel: 3, weight: 0.2, isMandatory: false },
        { skillName: "css", minLevel: 3, weight: 0.15, isMandatory: false },
        { skillName: "git", minLevel: 2, weight: 0.1, isMandatory: false },
      ],
    },
  ];

  for (const j of jobs) {
    const { requirements, ...jobData } = j;
    const existingJob = await prisma.job.findFirst({
      where: { recruiterId: j.recruiterId, title: j.title },
    });
    if (!existingJob) {
      await prisma.job.create({
        data: {
          ...jobData,
          requirements: {
            create: requirements,
          },
        },
      });
    }
  }

  // ===========================================================
  // SUMMARY
  // ===========================================================
  console.log("✅ Seed complete!\n");
  console.log("📋 Login Credentials (all passwords: Password123!):\n");
  console.log("   👑 Admin:     admin@talentmatch.com");
  console.log("   🏢 Recruiter: recruiter@techcorp.com");
  console.log("   🏢 Recruiter: recruiter@startuphub.com");
  console.log("   🏢 Recruiter: recruiter@dataworks.com");
  console.log("   👤 Candidate: rahul.dev@demo.com");
  console.log("   👤 Candidate: anita.cloud@demo.com");
  console.log("   👤 Candidate: vikram.ml@demo.com");
  console.log("   👤 Candidate: sneha.front@demo.com");
  console.log("   👤 Candidate: amit.backend@demo.com");
  console.log("   👤 Candidate: zara.data@demo.com");
  console.log("   👤 Candidate: rohan.mobile@demo.com");
  console.log("   👤 Candidate: priya.security@demo.com");
  console.log("   👤 Candidate: karan.intern@demo.com");
  console.log("   👤 Candidate: divya.lead@demo.com");
  console.log("\n   📌 5 Job postings created across 3 companies.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
