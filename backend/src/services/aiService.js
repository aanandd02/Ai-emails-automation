import { groq } from "../config/groqConfig.js";
import logger from "../utils/logger.js";

const MODEL = "llama-3.3-70b-versatile";

const STYLES = [
  "confident and concise",
  "friendly but professional",
  "polite and enthusiastic",
  "formal yet approachable",
  "warm and engaging",
];

export async function generateUniqueSubject(recipientName = "") {
  const tones = [
    `Application for SDE Role – ${recipientName}`,
    `Exploring SDE / Backend Opportunities | ${recipientName}`,
    `Introduction – ${recipientName}, Backend Engineer`,
    `SDE Application | ${recipientName}`,
    `${recipientName} | Backend & Full-Stack Developer`,
  ];
  return tones[Math.floor(Math.random() * tones.length)];
}

export async function generateEmail(recipientName = "") {
  const style = STYLES[Math.floor(Math.random() * STYLES.length)];
  const greeting = recipientName ? `Dear ${recipientName},` : "Dear HR,";

  const prompt = `
Write a short 100-word cold email applying for a full-time Software Development Engineer (SDE) role.
Do NOT mention any job platform, advertisement, or where I found the job.
Do NOT mention any projects.
Tone: ${style}.
Greeting: "${greeting}"

Candidate background:
- Name: Anand Shukla
- Final Year B.Tech student at IIIT Nagpur
- Strong in Java, JavaScript, Node.js, Express.js, REST APIs, AWS (Lambda, DynamoDB, S3), MySQL, MongoDB, Elasticsearch

Work experience to weave in naturally (2–3 sentences, sound human and impactful, not a bullet list):
- Currently a Backend Engineer Intern at Synup: building serverless microservices on AWS Lambda; identified and resolved a critical race condition in a live production pipeline causing data inconsistencies; built an automated ingestion pipeline that reduced manual effort by ~90%
- Previously at BrandX: engineered a concurrent-safe booking system for a high-traffic platform using Node.js and MongoDB

Important instructions:
- Use HTML <b> tags to bold: company names (Synup, BrandX), key metrics (~90%), and key tech (AWS Lambda, Node.js, MongoDB)
- Sound like a real engineer writing a genuine email — vary sentence rhythm, avoid stiff corporate language
- Show interest in contributing to their team, not just listing credentials
- Close by saying resume is attached and you'd love to discuss further

Do NOT include name or contact details in the body.
Do NOT add 'Sincerely' or any sign-off — end at the last sentence.
Output an HTML fragment only (body text with <b> tags, no wrapping html/body/head tags).
`;

  const myName = "Anand Shukla";
  const contact = {
    phone: "+91-9076823328",
    email: "aanandd9076@gmail.com",
    portfolio: "https://anand-shukla02.onrender.com/",
    linkedin: "https://www.linkedin.com/in/aanandd02",
    resume:
      "https://drive.google.com/file/d/16njcwPjtBjIbA6eycBdHgqXWgik4kd4K/view?usp=sharing",
  };

  try {
    logger.info(`🤖 Using Groq model: ${MODEL}`);

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 500,
    });

    const text = completion.choices[0].message.content;
    logger.info(`✅ Groq response generated successfully`);

    return buildBeautifulTemplate(text, { myName, ...contact });
  } catch (error) {
    logger.error("❌ Groq generation failed:", error.message);
    throw new Error("Email content generation failed");
  }
}

function buildBeautifulTemplate(
  emailText,
  { myName, phone, email, portfolio, linkedin, resume },
) {
  const body = emailText
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`/g, "")
    .replace(/^#+\s/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>")
    .trim();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      background: #f0f2f5;
      padding: 32px 16px;
    }

    .wrapper {
      max-width: 620px;
      margin: 0 auto;
    }

    .accent-bar {
      height: 4px;
      background: linear-gradient(90deg, #1a56db, #0ea5e9);
      border-radius: 4px 4px 0 0;
    }

    .card {
      background: #ffffff;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .card-header {
      padding: 24px 32px 16px;
    }

    .badge {
      display: inline-block;
      background: #eff6ff;
      color: #1a56db;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 10px 18px;
      border-radius: 999px;
      border: 1px solid #bfdbfe;
      margin-bottom: 0;
      line-height: 1;
    }

    .header-divider {
      height: 1px;
      background: #e5e7eb;
      margin-top: 10px;
    }

    .card-body {
      padding: 0px 32px 24px;
    }

    .email-text {
      font-size: 15px;
      color: #374151;
      line-height: 1.8;
    }

    .email-text b {
      color: #111827;
      font-weight: 600;
    }

    .divider {
      border: none;
      border-top: 1px solid #f0f0f0;
      margin: 24px 0;
    }

    .signature {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1a56db, #0ea5e9);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
    }

    .sig-info .name {
      font-size: 15px;
      font-weight: 600;
      color: #111827;
    }

    .sig-info .title {
      font-size: 12px;
      color: #6b7280;
      margin-top: 2px;
    }

    .contact-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .contact-links a {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12.5px;
      color: #1a56db;
      text-decoration: none;
      background: #f5f8ff;
      padding: 5px 12px;
      border-radius: 20px;
      border: 1px solid #dbeafe;
      font-weight: 500;
    }

    @media only screen and (max-width: 600px) {
      .card-header,
      .card-body {
        padding-left: 20px;
        padding-right: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="accent-bar"></div>
    <div class="card">

      <div class="card-header">
        <div class="badge">Full-Time · SDE Application</div>
        <div class="header-divider"></div>
      </div>

      <div class="card-body">
  <p class="email-text">${body}</p>

  <!-- Signature wrapper -->
  <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:20px;font-family:'Segoe UI',Arial,sans-serif;">
    
    <!-- Name + Avatar row -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="52" valign="middle">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#1a56db,#0ea5e9);text-align:center;line-height:44px;color:#fff;font-weight:700;font-size:16px;font-family:'Segoe UI',Arial,sans-serif;">AS</div>
        </td>
        <td valign="middle" style="padding-left:12px;">
          <div style="font-size:15px;font-weight:600;color:#111827;font-family:'Segoe UI',Arial,sans-serif;">${myName}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;font-family:'Segoe UI',Arial,sans-serif;">Backend Engineer &middot; Final Year, IIIT Nagpur</div>
        </td>
      </tr>
    </table>

    <!-- All buttons in one flow — wraps naturally on mobile -->
    <div style="margin-top:12px;">
      <a href="tel:${phone}" style="display:inline-block;font-size:12px;line-height:1.4;color:#1a56db;text-decoration:none;background:#eff6ff;padding:5px 12px;border-radius:20px;border:1px solid #bfdbfe;font-family:'Segoe UI',Arial,sans-serif;white-space:nowrap;margin:0 6px 6px 0;">📞 ${phone}</a><a href="mailto:${email}" style="display:inline-block;font-size:12px;line-height:1.4;color:#1a56db;text-decoration:none;background:#eff6ff;padding:5px 12px;border-radius:20px;border:1px solid #bfdbfe;font-family:'Segoe UI',Arial,sans-serif;white-space:nowrap;margin:0 6px 6px 0;">✉️ ${email}</a><a href="${portfolio}" target="_blank" style="display:inline-block;font-size:12px;line-height:1.4;color:#1a56db;text-decoration:none;background:#eff6ff;padding:5px 12px;border-radius:20px;border:1px solid #bfdbfe;font-family:'Segoe UI',Arial,sans-serif;white-space:nowrap;margin:0 6px 6px 0;">🌐 Portfolio</a><a href="${linkedin}" target="_blank" style="display:inline-block;font-size:12px;line-height:1.4;color:#1a56db;text-decoration:none;background:#eff6ff;padding:5px 12px;border-radius:20px;border:1px solid #bfdbfe;font-family:'Segoe UI',Arial,sans-serif;white-space:nowrap;margin:0 6px 6px 0;">💼 LinkedIn</a><a href="${resume}" target="_blank" style="display:inline-block;font-size:12px;line-height:1.4;color:#ffffff;text-decoration:none;background:#1a56db;padding:5px 14px;border-radius:20px;font-family:'Segoe UI',Arial,sans-serif;font-weight:600;white-space:nowrap;margin:0 6px 6px 0;">📄 Resume (Attached)</a>
    </div>

  </div>
</div>

    </div>
  </div>
</body>
</html>
`;
}
