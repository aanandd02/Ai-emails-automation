import { groq } from "../config/groqConfig.js";
import logger from "../utils/logger.js";

const MODEL = "llama-3.3-70b-versatile";

const STYLES = [
  "confident and concise",
  "friendly but professional",
  "warm and engaging",
  "polite and enthusiastic",
];

const SUBJECTS = [
  "SDE-1 Opening | LeetCode Knight (Rating 2006) | AWS & Backend Engineer",
  "Backend Engineer | LeetCode Knight (Top 2.44%) | AWS Serverless + Node.js",
  "SDE-1 Application | AWS Lambda · Node.js · LeetCode Knight | Anand Shukla",
  "Software Development Engineer | LeetCode Knight (2006) | IIIT Nagpur",
  "SDE-1 Role | Serverless Microservices · Node.js · MongoDB | Anand Shukla",
];

export async function generateUniqueSubject() {
  return SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
}

export async function generateEmail(recipientName = "") {
  const style = STYLES[Math.floor(Math.random() * STYLES.length)];
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  const nameContext = recipientName
    ? `The recipient's name is ${recipientName}. Address them naturally if it fits the tone.`
    : "No recipient name provided. Use a general tone.";

  const prompt = `
Write a HIGH-RESPONSE generalised cold email body in MAX 65 WORDS applying for a full-time Software Development Engineer (SDE-1) role.

Rules:
- Maximum 65 words
- Natural human tone, no buzzwords
- 3–4 sentences only
- Combine BOTH: mention LeetCode Knight (top 2.44% globally, rating 2006) AND one real internship achievement
- Do NOT repeat the greeting — it is already added separately
- Do NOT mention any specific company name the email is being sent to
- Do NOT mention notice period or joining timeline
- Do NOT mention projects
- Do NOT mention job platforms
- Do NOT add sign-offs
- End with exactly: "Resume attached for your reference. I'd appreciate the chance to connect."
- Tone: ${style}
- ${nameContext}

Candidate Background:
Name: Anand Shukla
Final Year B.Tech ECE at IIIT Nagpur
LeetCode Knight — Rating 2006, Top 2.44% globally, 400+ problems solved

Work Experience:

Synup (Backend Engineer Intern):
- Built serverless microservices using AWS Lambda, MySQL, Elasticsearch
- Resolved a critical production race condition across concurrent Lambda services
- Reduced pipeline failures by ~40% in a distributed event-driven system

BrandX (Backend Developer Intern):
- Built concurrent-safe booking system using Node.js and MongoDB
- Implemented atomic reservation logic preventing double bookings
- Reduced API response latency by ~35% under peak traffic

Tech Stack: Java, Node.js, Express.js, REST APIs, AWS Lambda, DynamoDB, MySQL, MongoDB

Formatting:
- Use <b> tags for company names: <b>Synup</b> or <b>BrandX</b>
- Output HTML fragment only — no markdown, no backticks, no extra commentary
`;

  const myName = "Anand Shukla";

  const contact = {
    phone: "+91-9076823328",
    email: "aanandd9076@gmail.com",
    portfolio: "https://anand-shukla02.onrender.com/",
    resume:
      "https://drive.google.com/file/d/1tppKMCDPsWeHdtFIaMD-jWEUdVSz9hW-/view?usp=sharing",
  };

  try {
    logger.info(`🤖 Using Groq model: ${MODEL}`);
    logger.info(`👤 Recipient: ${recipientName || "unknown"}`);

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.75,
      max_tokens: 250,
    });

    const text = completion.choices[0].message.content;

    logger.info("✅ Email generated");

    return {
      subject: await generateUniqueSubject(),
      html: buildBeautifulTemplate(greeting, text, { myName, ...contact }),
    };
  } catch (error) {
    logger.error("❌ Groq generation failed:", error.message);
    throw new Error("Email content generation failed");
  }
}

function buildBeautifulTemplate(
  greeting,
  emailText,
  { myName, phone, email, portfolio, resume }
) {
  const body = emailText
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`/g, "")
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>")
    .trim();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Segoe UI,Arial,sans-serif;">

<div style="max-width:620px;margin:32px auto;background:#ffffff;padding:32px;border-radius:8px;border:1px solid #e5e5e5;">

  <!-- Personalised Greeting -->
  <div style="font-size:15px;line-height:1.7;color:#333;margin-bottom:12px;">
    ${greeting}
  </div>

  <!-- AI-Generated Body -->
  <div style="font-size:15px;line-height:1.8;color:#333;margin-bottom:20px;">
    ${body}
  </div>

  <!-- Divider -->
  <hr style="margin:20px 0;border:none;border-top:1px solid #e5e5e5;" />

  <!-- Name -->
  <div style="font-size:15px;color:#111;font-weight:600;">
    ${myName}
  </div>

  <!-- Title -->
  <div style="font-size:13px;color:#666;margin-top:2px;">
    Software Development Engineer &nbsp;·&nbsp; IIIT Nagpur
  </div>

  <!-- Contact -->
  <div style="margin-top:8px;font-size:13px;color:#444;line-height:1.8;">
    <a href="tel:${phone}" style="color:#444;text-decoration:none;">${phone}</a><br />
    <a href="mailto:${email}" style="color:#444;text-decoration:none;">${email}</a>
  </div>

  <!-- CTA Buttons -->
  <div style="margin-top:14px;">
    <a href="${portfolio}"
      style="display:inline-block;padding:7px 14px;margin-right:8px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:5px;font-size:12px;font-weight:500;">
      Portfolio
    </a>
    <a href="${resume}"
      style="display:inline-block;padding:7px 14px;background:#0a66c2;color:#ffffff;text-decoration:none;border-radius:5px;font-size:12px;font-weight:500;">
      Resume
    </a>
  </div>

</div>

</body>
</html>
`;
}