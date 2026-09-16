import logger from "../utils/logger.js";
import profile from "../config/profile.js";

const MODEL = "gemini-2.5-flash";

const STYLES = [
  "confident and concise",
  "friendly but professional",
  "warm and engaging",
  "polite and enthusiastic",
];

const SUBJECTS = [
  "Full-time SDE-1 / AI Engineer role — Anand Shukla (IIIT Nagpur '26)",
  "Exploring full-time SDE-1 / AI Engineer roles — LeetCode Knight (2006), Ex-Synup",
  "SDE-1 / AI Engineer opening at {company}? — Quick intro from Anand",
  "Backend + AI Engineer (Ex-Synup, BrandX | LeetCode Knight 2006) — Anand Shukla",
  "Full-time opportunity — Backend & AI Engineer | Node.js · AWS · LangGraph · Qdrant",
  "Actively seeking SDE-1 / AI Engineer role — IIIT Nagpur, LeetCode Top 2.4%",
  "Open to SDE-1 / AI Engineer roles at {company} — Anand Shukla",
];

export async function generateUniqueSubject() {
  return SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
}

async function generateWithGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing in environment variables.");
  }
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b",
      temperature: 0.75,
      max_tokens: 300
    })
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Groq HTTP Error: ${response.status}`);
  }
  
  const data = await response.json();
  if (data && data.choices && data.choices.length > 0) {
    return data.choices[0].message.content;
  }
  throw new Error("Unexpected Groq API response format.");
}

export async function generateEmail(recipientName = "", companyName = "your company") {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  
  // Only ask Gemini for the compliment sentence — nothing else
  const prompt = `Write ONE short professional sentence complimenting the company's work for a cold email.
Company: ${companyName}
Example output: the work you all are doing at the intersection of AI and product development is genuinely exciting.
Rules: No em dashes. No quotes. No punctuation at start. End with a period. If company name is generic, write: the work you are doing is genuinely exciting.`;

  try {
    logger.info(`🤖 Using Gemini model: ${MODEL}`);
    logger.info(`👤 Recipient: ${recipientName || "unknown"}`);

    let compliment = "the work you are doing is genuinely exciting.";
    let retries = 3;
    let backoff = 10000;

    while (retries >= 0) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY is missing in environment variables.");
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
        
        const fetchPromise = fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.75,
              maxOutputTokens: 500,
              thinkingConfig: { thinkingBudget: 0 },
            }
          })
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            const err = new Error("Gemini API timeout");
            err.status = 408;
            reject(err);
          }, 15000);
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errorMsg = errData?.error?.message || `HTTP Error: ${response.status}`;
          const err = new Error(errorMsg);
          err.status = response.status;
          throw err;
        }

        const data = await response.json();
        
        if (data && data.candidates && data.candidates.length > 0) {
          compliment = data.candidates[0].content.parts[0].text
            .replace(/—/g, "-")
            .replace(/`/g, "")
            .replace(/\n/g, " ")
            .trim();
          break;
        } else {
          throw new Error("Unexpected API response format.");
        }

      } catch (error) {
        const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));
        if (isRateLimit) {
          logger.warn(`Gemini rate limit hit. Falling back to Groq...`);
          try {
            const groqRaw = await generateWithGroq(prompt);
            compliment = groqRaw.replace(/—/g, "-").replace(/`/g, "").replace(/\n/g, " ").trim();
            logger.info("✅ Groq successfully generated compliment as fallback");
            break;
          } catch (groqError) {
            logger.error(`Groq fallback failed: ${groqError.message}`);
            let waitSeconds = backoff / 1000;
            const rlError = new Error("Both Gemini and Groq (fallback) failed due to rate limit/errors");
            rlError.isRateLimit = true;
            rlError.waitSeconds = waitSeconds;
            backoff *= 2;
            throw rlError;
          }
        } else {
          retries--;
          if (retries < 0) {
            logger.warn(`Gemini retries exhausted (${error.message}). Attempting Groq fallback...`);
            try {
              const groqRaw = await generateWithGroq(prompt);
              compliment = groqRaw.replace(/—/g, "-").replace(/`/g, "").replace(/\n/g, " ").trim();
              logger.info("✅ Groq fallback succeeded after Gemini failure");
              break;
            } catch (groqError) {
              logger.error(`Groq fallback also failed: ${groqError.message}`);
              throw error;
            }
          }
          logger.warn(`Gemini API error (${error.message}). Retries left: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    logger.info("✅ Email generated");

    // Build paragraphs in code — guaranteed formatting and spacing
    const paragraphs = [
      `I came across your profile while exploring opportunities at ${companyName}. ${compliment}`,
      `I'm Anand, graduating from IIIT Nagpur (B.Tech '26) with backend SDE internships at <b>Synup</b> and <b>BrandX</b>. At Synup, I built serverless microservices with AWS Lambda, MySQL, and Elasticsearch, cutting pipeline failures by ~40% and resolving distributed race conditions. At BrandX, I engineered concurrent-safe booking services with Node.js and MongoDB, reducing peak API latency by ~35%. Across my work, I've built and deployed 6+ production backend systems.`,
      `On the AI side, I build production-grade agentic systems — including an <b>Enterprise RAG & Agent Platform</b> using Python, FastAPI, LangGraph, and Qdrant (hybrid retrieval, reranking, and RAGAS evaluations), as well as an AST-aware code intelligence agent. Additionally, I'm a <b>LeetCode Knight</b> (Contest Rating 2006, Global Top 2.44%, 400+ problems solved).`,
      `I'm actively looking for full-time <b>SDE-1</b> or <b>AI Engineer</b> roles and would love to see if there's a strong fit with your team at ${companyName}. Would you be open to a brief 10-minute chat?`,
    ];

    return {
      subject: SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)].replace("{company}", companyName),
      html: buildBeautifulTemplate(greeting, paragraphs),
    };
  } catch (error) {
    logger.error("❌ Email generation failed:", error.message);
    if (error.isRateLimit) {
      throw error;
    }
    throw new Error(`Email content generation failed: ${error.message}`);
  }
}

function buildBeautifulTemplate(greeting, paragraphs) {
  // Build paragraph HTML — each paragraph gets proper spacing
  const bodyHtml = paragraphs
    .map(para => `<p style="margin:0 0 16px 0;line-height:1.75;color:#374151;">${para}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<div style="max-width:620px;margin:28px auto;background:#ffffff;padding:32px;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.04);">

  <!-- Greeting -->
  <div style="font-size:15px;line-height:1.7;color:#111827;margin-bottom:14px;font-weight:500;">
    ${greeting}
  </div>

  <!-- Body Content -->
  <div style="font-size:14.5px;color:#374151;margin-bottom:24px;">
    ${bodyHtml}
  </div>

  <!-- Signature -->
  <table style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;width:100%;border-collapse:collapse;">
    <tr>
      <td style="width:48px;vertical-align:top;padding-right:14px;">
        <table style="border-collapse:collapse;">
          <tr>
            <td style="width:44px;height:44px;border-radius:50%;background:#1d4ed8;text-align:center;vertical-align:middle;font-size:14px;font-weight:700;color:#ffffff;letter-spacing:0.5px;line-height:44px;">
              AS
            </td>
          </tr>
        </table>
      </td>
      <td style="vertical-align:top;">
        <div style="font-size:15px;font-weight:700;color:#111827;line-height:1.3;">
          ${profile.name}
        </div>
        <div style="font-size:12.5px;color:#4b5563;margin-top:3px;line-height:1.4;">
          Backend &amp; AI Engineer &nbsp;·&nbsp; IIIT Nagpur ('26) &nbsp;·&nbsp; LeetCode Knight (2006)
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:3px;">
          <a href="tel:${profile.phone}" style="color:#4b5563;text-decoration:none;">${profile.phone}</a> &nbsp;|&nbsp;
          <a href="mailto:${profile.email}" style="color:#4b5563;text-decoration:none;">${profile.email}</a>
        </div>
        <div style="margin-top:12px;line-height:2.2;">
          <a href="${profile.links.resume}" target="_blank" style="display:inline-block;padding:5px 12px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:5px;font-size:11.5px;font-weight:600;margin-right:6px;">📄 Resume</a>
          <a href="${profile.links.portfolio}" target="_blank" style="display:inline-block;padding:5px 12px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:5px;font-size:11.5px;font-weight:600;margin-right:6px;">🌐 Portfolio</a>
          <a href="${profile.links.linkedin}" target="_blank" style="display:inline-block;padding:5px 12px;background:#0a66c2;color:#ffffff;text-decoration:none;border-radius:5px;font-size:11.5px;font-weight:600;margin-right:6px;">💼 LinkedIn</a>
          <a href="${profile.links.github}" target="_blank" style="display:inline-block;padding:5px 12px;background:#24292f;color:#ffffff;text-decoration:none;border-radius:5px;font-size:11.5px;font-weight:600;margin-right:6px;">🐙 GitHub</a>
          <a href="${profile.links.leetcode}" target="_blank" style="display:inline-block;padding:5px 12px;background:#d97706;color:#ffffff;text-decoration:none;border-radius:5px;font-size:11.5px;font-weight:600;">⚔️ LeetCode (2006)</a>
        </div>
      </td>
    </tr>
  </table>

</div>

</body>
</html>
`;
}