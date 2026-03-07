// POST /api/profile/resume-parse — Upload resume (PDF/text), parse with Gemini, return structured data
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseResumeText } from "@/lib/resume-parser";

// Max 5 MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "CANDIDATE") {
      return NextResponse.json(
        { error: "Only candidates can parse resumes" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No resume file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 400 }
      );
    }

    // Extract text based on file type
    let resumeText: string;
    const fileType = file.type;

    if (fileType === "application/pdf") {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        // Dynamic import to avoid bundling issues
        const pdfParse = await import("pdf-parse");
        const PDFParse = pdfParse.PDFParse;
        const parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        resumeText = typeof pdfData === "string" ? pdfData : pdfData.text;
      } catch (pdfErr) {
        console.error("[RESUME PDF PARSE ERROR]", pdfErr);
        return NextResponse.json(
          { error: "Failed to read PDF. Make sure the file is a valid PDF." },
          { status: 422 }
        );
      }
    } else if (
      fileType === "text/plain" ||
      fileType === "text/markdown" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md")
    ) {
      resumeText = await file.text();
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or text file." },
        { status: 400 }
      );
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text from the file. Try a different format." },
        { status: 422 }
      );
    }

    // Parse with Gemini
    const parsed = await parseResumeText(resumeText);

    return NextResponse.json({
      data: parsed,
      message: `Extracted ${parsed.hardSkills.length} technical skills and ${parsed.softSkills.length} soft skills from resume`,
    });
  } catch (error) {
    console.error("[POST /api/profile/resume-parse]", error);
    return NextResponse.json(
      { error: "Failed to parse resume. Please try again." },
      { status: 500 }
    );
  }
}
