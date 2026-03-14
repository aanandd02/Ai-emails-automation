import { groq } from "../config/groqConfig.js";
import logger from "../utils/logger.js";

const MODEL = "llama-3.3-70b-versatile";

const STYLES = [
  "confident and concise",
  "friendly but professional",
  "warm and engaging",
  "polite and enthusiastic",
];

export async function generateUniqueSubject(recipientName = "") {
  const subjects = [
    `Software Development Engineer | Notice Period | Anand Shukla`,
    `SDE Application | Anand Shukla`,
    `Software Development Engineer | Immediate Joiner`,
    `SDE Opportunity | Anand Shukla`,
    `Exploring Software Development Engineer Roles`,
  ];

  return subjects[Math.floor(Math.random() * subjects.length)];
}

export async function generateEmail(recipientName = "") {
  const style = STYLES[Math.floor(Math.random() * STYLES.length)];
  const greeting = recipientName ? `Dear ${recipientName},` : "Hello,";

  const prompt = `
Write a HIGH-RESPONSE cold email in **MAX 60 WORDS** applying for a full-time Software Development Engineer (SDE) role.

Rules:
- Maximum 60 words
- Natural human tone
- 3–4 sentences only
- Mention ONE achievement from <b>Synup</b> and ONE from <b>BrandX</b>
- Mention that I am currently serving my notice period
- Indicate availability to join soon
- Express interest in a Software Development Engineer (SDE) role
- End with: "Resume attached for your reference. I'd appreciate the chance to connect."
- Do NOT mention projects
- Do NOT mention job platforms
- Do NOT add sign-offs

Greeting: "${greeting}"
Tone: ${style}

Candidate Background:
Name: Anand Shukla
Final Year B.Tech at IIIT Nagpur

Work Experience:

Synup:
- Backend Engineer Intern
- Built serverless microservices using AWS Lambda
- Resolved a production race condition across concurrent services
- Improved reliability of a distributed data pipeline reducing failures

BrandX:
- Backend Developer Intern
- Built a concurrent booking system using Node.js and MongoDB
- Implemented atomic reservation logic preventing double bookings
- Optimized reservation APIs improving response latency

Availability:
- Currently serving notice period
- Available for full-time Software Development Engineer roles

Tech Stack:
Java, Node.js, Express.js, REST APIs, AWS Lambda, DynamoDB, MySQL, MongoDB

Formatting:
- Use <b> tags for company names (<b>Synup</b>, <b>BrandX</b>)
- Output HTML fragment only
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

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    const text = completion.choices[0].message.content;

    logger.info("✅ Email generated");

    return buildBeautifulTemplate(text, { myName, ...contact });
  } catch (error) {
    logger.error("❌ Groq generation failed:", error.message);
    throw new Error("Email content generation failed");
  }
}

function buildBeautifulTemplate(
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
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Segoe UI,Arial,sans-serif">

<div style="max-width:620px;margin:auto;background:#ffffff;padding:28px;border-radius:8px">

  <div style="font-size:15px;line-height:1.7;color:#333">
    ${body}
  </div>

  <hr style="margin:5px 0;border:none;border-top:1px solid #e5e5e5">

  <div style="font-size:15px;color:#111;font-weight:600">
    ${myName}
  </div>

  <div style="font-size:13px;color:#666;margin-top:2px">
    Software Development Engineer · IIIT Nagpur
  </div>

  <div style="margin-top:6px;font-size:13px;color:#444">
    Phone: <a href="tel:${phone}" style="color:#444;text-decoration:none">${phone}</a><br>
    Email: <a href="mailto:${email}" style="color:#444;text-decoration:none">${email}</a>
  </div>

  <div style="margin-top:10px">
    <a href="${portfolio}" 
      style="display:inline-block;padding:6px 11px;margin-right:6px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:4px;font-size:11px">
      Portfolio
    </a>

    <a href="${resume}" 
      style="display:inline-block;padding:6px 11px;background:#0a66c2;color:#ffffff;text-decoration:none;border-radius:4px;font-size:11px">
      Resume
    </a>
  </div>

</div>

</body>
</html>
`;
}