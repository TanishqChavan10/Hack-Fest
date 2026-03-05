// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Prisma client is generated at build time
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

// Create Supabase Admin client for creating auth users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin key required for user creation
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Default password for all seeded users
const DEFAULT_PASSWORD = "Password123!";

async function main() {
  console.log("🌱 Starting seed...");
  console.log(`📧 All seeded accounts will use password: ${DEFAULT_PASSWORD}`);

  // -------------------------------------------------------
  // Seed admin
  // -------------------------------------------------------
  console.log("\n👤 Creating admin user...");
  const adminEmail = "admin@talentmatch.com";
  
  // Create in Supabase Auth first
  const { data: adminAuthData, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: DEFAULT_PASSWORD,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      name: "Platform Admin",
      role: "ADMIN",
    },
  });

  let adminSupabaseUserId: string | undefined;

  if (adminAuthError) {
    if (adminAuthError.code === "email_exists" || adminAuthError.message.includes("already registered")) {
      console.log(`   ℹ️  Admin user already exists in Supabase Auth, updating password...`);
      
      // Get existing user
      const { data: adminUserList } = await supabaseAdmin.auth.admin.listUsers();
      const existingAdmin = adminUserList?.users.find((u) => u.email === adminEmail);
      
      if (existingAdmin) {
        // Update password and metadata
        await supabaseAdmin.auth.admin.updateUserById(existingAdmin.id, {
          password: DEFAULT_PASSWORD,
          user_metadata: {
            name: "Platform Admin",
            role: "ADMIN",
          },
        });
        console.log(`   ✅ Password reset to ${DEFAULT_PASSWORD}`);
        adminSupabaseUserId = existingAdmin.id;
      } else {
        console.error(`   ❌ Could not find admin user in Supabase user list`);
      }
    } else {
      console.error(`   ❌ Error creating admin in Supabase:`, adminAuthError);
    }
  } else {
    console.log(`   ✅ Admin created in Supabase Auth: ${adminAuthData.user.id}`);
    adminSupabaseUserId = adminAuthData.user.id;
  }

  if (!adminSupabaseUserId) {
    console.error("   ❌ Could not get admin user ID");
    return;
  }

  // Create in Prisma database
  const adminUser = await prisma.user.upsert({
    where: { id: adminSupabaseUserId },
    update: {
      email: adminEmail,
      name: "Platform Admin",
      role: "ADMIN",
    },
    create: {
      id: adminSupabaseUserId,
      email: adminEmail,
      name: "Platform Admin",
      role: "ADMIN",
    },
  });

  console.log(`   ✅ Admin created in database: ${adminUser.email}`);

  // ===========================================================
  // Helper function to create user in Supabase Auth + Prisma
  // ===========================================================
  async function createUser(email: string, name: string, role: "RECRUITER" | "CANDIDATE") {
    console.log(`\n👤 Creating ${role.toLowerCase()}: ${email}...`);
    
    // Create in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { name, role },
    });

    if (authError) {
      if (authError.code === "email_exists" || authError.message.includes("already registered")) {
        console.log(`   ℹ️  User already exists in Supabase Auth, updating password...`);
        
        // Get existing user and update password
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = userList?.users.find((u) => u.email === email);
        
        if (existingUser) {
          // Update user's password and metadata
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password: DEFAULT_PASSWORD,
            user_metadata: { name, role },
          });
          console.log(`   ✅ Password reset to ${DEFAULT_PASSWORD}`);
          return existingUser.id;
        } else {
          console.error(`   ❌ Could not find user in Supabase user list`);
        }
        return null;
      } else {
        console.error(`   ❌ Error creating in Supabase:`, authError);
        return null;
      }
    }

    console.log(`   ✅ Created in Supabase Auth: ${authData.user.id}`);
    return authData.user.id;
  }

  // ===========================================================
  // 2. RECRUITERS (3 companies)
  // ===========================================================
  console.log("\n🏢 Creating recruiters...");
  
  const recruiter1Id = await createUser("recruiter@techcorp.com", "Priya Sharma", "RECRUITER");
  const recruiter1 = recruiter1Id ? await prisma.user.upsert({
    where: { id: recruiter1Id },
    update: {},
    create: {
      id: recruiter1Id,
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
  }) : null;
  if (recruiter1) console.log(`   ✅ Created in database: ${recruiter1.email}`);

  const recruiter2Id = await createUser("recruiter@startuphub.com", "Raj Patel", "RECRUITER");
  const recruiter2 = recruiter2Id ? await prisma.user.upsert({
    where: { id: recruiter2Id },
    update: {},
    create: {
      id: recruiter2Id,
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
  }) : null;
  if (recruiter2) console.log(`   ✅ Created in database: ${recruiter2.email}`);

  const recruiter3Id = await createUser("recruiter@dataworks.com", "Meera Krishnan", "RECRUITER");
  const recruiter3 = recruiter3Id ? await prisma.user.upsert({
    where: { id: recruiter3Id },
    update: {},
    create: {
      id: recruiter3Id,
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
  }) : null;
  if (recruiter3) console.log(`   ✅ Created in database: ${recruiter3.email}`);

  // ===========================================================
  // 3. CANDIDATES (10 diverse profiles)
  // ===========================================================
  console.log("\n👥 Creating candidates...");
  
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
    const userId = await createUser(c.email, c.name, "CANDIDATE");
    if (!userId) continue;

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
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
    
    console.log(`   ✅ Created in database: ${user.email}`);
    if (user.candidateProfile) createdCandidateIds.push(user.candidateProfile.userId);
  }

  // ===========================================================
  // 4. JOB POSTINGS (5 diverse roles)
  // ===========================================================
  console.log("\n💼 Creating job postings...");
  
  if (!recruiter1 || !recruiter2 || !recruiter3) {
    console.error("   ❌ Recruiters not created, skipping jobs");
  } else {
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

    const createdJobs = [];
    for (const j of jobs) {
      const { requirements, ...jobData } = j;
      let job = await prisma.job.findFirst({
        where: { recruiterId: j.recruiterId, title: j.title },
      });
      if (!job) {
        job = await prisma.job.create({
          data: {
            ...jobData,
            requirements: {
              create: requirements,
            },
          },
        });
        console.log(`   ✅ Created job: ${j.title}`);
      }
      createdJobs.push(job);
    }

    // ===========================================================
    // 5. JOB APPLICATIONS (15 applications with variety)
    // ===========================================================
    console.log("\n📝 Creating job applications...");
    
    if (createdCandidateIds.length > 0 && createdJobs.length > 0) {
      const applications = [
        // Rahul (Full-Stack) applies to Senior Full-Stack and DevOps
        {
          jobTitle: "Senior Full-Stack Engineer",
          candidateEmail: "rahul.dev@demo.com",
          status: "SHORTLISTED" as const,
          coverLetter: "I'm excited to bring my 4 years of React and Node.js experience to TechCorp. I've led the migration of legacy systems to modern TypeScript stack and would love to contribute to your platform.",
        },
        {
          jobTitle: "DevOps / SRE Engineer",
          candidateEmail: "rahul.dev@demo.com",
          status: "PENDING" as const,
          coverLetter: "While primarily a full-stack developer, I have strong DevOps skills including Docker and AWS experience that I'd like to expand further.",
        },
        
        // Anita (DevOps) applies to DevOps and Senior Full-Stack
        {
          jobTitle: "DevOps / SRE Engineer",
          candidateEmail: "anita.cloud@demo.com",
          status: "SHORTLISTED" as const,
          coverLetter: "As an AWS Certified SRE with 6 years managing Kubernetes clusters, I'm confident I can contribute immediately to your infrastructure team.",
        },
        {
          jobTitle: "Senior Full-Stack Engineer",
          candidateEmail: "anita.cloud@demo.com",
          status: "REJECTED" as const,
          coverLetter: "Interested in transitioning more into full-stack development while leveraging my cloud expertise.",
        },
        
        // Vikram (ML) applies to ML Engineer
        {
          jobTitle: "Machine Learning Engineer",
          candidateEmail: "vikram.ml@demo.com",
          status: "SHORTLISTED" as const,
          coverLetter: "My research background in NLP and experience deploying PyTorch models in production aligns perfectly with your clinical text analysis requirements.",
        },
        
        // Sneha (Frontend) applies to Frontend and Full-Stack
        {
          jobTitle: "Frontend Developer (React Native)",
          candidateEmail: "sneha.front@demo.com",
          status: "SHORTLISTED" as const,
          coverLetter: "I specialize in creating pixel-perfect UIs with React Native and have experience with fintech payment integrations from my previous role.",
        },
        {
          jobTitle: "Senior Full-Stack Engineer",
          candidateEmail: "sneha.front@demo.com",
          status: "PENDING" as const,
        },
        
        // Amit (Backend Java) applies to Senior Full-Stack
        {
          jobTitle: "Senior Full-Stack Engineer",
          candidateEmail: "amit.backend@demo.com",
          status: "PENDING" as const,
          coverLetter: "With 7 years in backend microservices, I'm eager to expand my full-stack capabilities with your React/Node stack.",
        },
        
        // Zara (Data Engineer) applies to ML and DevOps
        {
          jobTitle: "Machine Learning Engineer",
          candidateEmail: "zara.data@demo.com",
          status: "PENDING" as const,
          coverLetter: "My Spark and data pipeline experience complements ML workflows well. I'm excited to focus more on the ML side.",
        },
        
        // Rohan (Mobile) applies to Frontend
        {
          jobTitle: "Frontend Developer (React Native)",
          candidateEmail: "rohan.mobile@demo.com",
          status: "SHORTLISTED" as const,
          coverLetter: "Published 5 apps on both stores with Flutter and React Native. Would love to join your fintech mobile team.",
        },
        
        // Priya (Security) applies to DevOps and Full-Stack
        {
          jobTitle: "DevOps / SRE Engineer",
          candidateEmail: "priya.security@demo.com",
          status: "PENDING" as const,
          coverLetter: "Bringing DevSecOps expertise to strengthen your infrastructure security posture.",
        },
        
        // Karan (Junior) applies to Internship
        {
          jobTitle: "Junior Web Developer (Internship)",
          candidateEmail: "karan.intern@demo.com",
          status: "SHORTLISTED" as const,
          coverLetter: "Final year CS student passionate about web development. I've built several React projects and am eager to learn from your experienced team.",
        },
        
        // Divya (Lead) applies to Senior Full-Stack and ML
        {
          jobTitle: "Senior Full-Stack Engineer",
          candidateEmail: "divya.lead@demo.com",
          status: "SHORTLISTED" as const,
          coverLetter: "With 12 years leading engineering teams and deep expertise in system design, I can contribute both technically and as a mentor to junior developers.",
        },
        {
          jobTitle: "Machine Learning Engineer",
          candidateEmail: "divya.lead@demo.com",
          status: "PENDING" as const,
        },
        
        // Additional applications for diversity
        {
          jobTitle: "Junior Web Developer (Internship)",
          candidateEmail: "sneha.front@demo.com",
          status: "REJECTED" as const,
          coverLetter: "Open to mentoring opportunities as well.",
        },
      ];

      let createdCount = 0;
      for (const app of applications) {
        // Find job by title
        const job = createdJobs.find((j) => j.title === app.jobTitle);
        if (!job) continue;

        // Find candidate by email
        const candidate = await prisma.user.findUnique({
          where: { email: app.candidateEmail },
          select: { id: true },
        });
        if (!candidate) continue;

        // Check if application already exists
        const existing = await prisma.application.findUnique({
          where: {
            jobId_candidateId: {
              jobId: job.id,
              candidateId: candidate.id,
            },
          },
        });

        if (!existing) {
          await prisma.application.create({
            data: {
              jobId: job.id,
              candidateId: candidate.id,
              status: app.status,
              coverLetter: app.coverLetter,
            },
          });
          createdCount++;
        }
      }
      
      console.log(`   ✅ Created ${createdCount} job applications`);
    }
  }

  // ===========================================================
  // SUMMARY
  // ===========================================================
  console.log("\n✅ Seed complete!\n");
  console.log("=".repeat(60));
  console.log("📋 LOGIN CREDENTIALS");
  console.log("=".repeat(60));
  console.log(`\n🔑 Password for ALL accounts: ${DEFAULT_PASSWORD}\n`);
  console.log("👑 ADMIN:");
  console.log("   Email: admin@talentmatch.com");
  console.log("\n🏢 RECRUITERS:");
  console.log("   Email: recruiter@techcorp.com");
  console.log("   Email: recruiter@startuphub.com");
  console.log("   Email: recruiter@dataworks.com");
  console.log("\n👥 CANDIDATES:");
  console.log("   Email: rahul.dev@demo.com");
  console.log("   Email: anita.cloud@demo.com");
  console.log("   Email: vikram.ml@demo.com");
  console.log("   Email: sneha.front@demo.com");
  console.log("   Email: amit.backend@demo.com");
  console.log("   Email: zara.data@demo.com");
  console.log("   Email: rohan.mobile@demo.com");
  console.log("   Email: priya.security@demo.com");
  console.log("   Email: karan.intern@demo.com");
  console.log("   Email: divya.lead@demo.com");
  console.log("\n" + "=".repeat(60));
  console.log("💼 5 Job postings created across 3 companies");
  console.log("📝 15 Job applications submitted with various statuses");
  console.log("=".repeat(60) + "\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
