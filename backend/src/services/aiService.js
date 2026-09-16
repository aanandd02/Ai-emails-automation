import logger from "../utils/logger.js";
import profile from "../config/profile.js";

const MODEL = "gemini-2.5-flash";

const DEFAULT_SUBJECTS = [
  "Full-time SDE-1 / AI Engineer role — Anand Shukla (IIIT Nagpur '26)",
  "Exploring full-time SDE-1 / AI Engineer roles — LeetCode Knight (2006), Ex-Synup",
  "SDE-1 / AI Engineer opening at {company}? — Quick intro from Anand",
  "Backend + AI Engineer (Ex-Synup, BrandX | LeetCode Knight 2006) — Anand Shukla",
  "Full-time opportunity — Backend & AI Engineer | Node.js · AWS · LangGraph · Qdrant",
  "Actively seeking SDE-1 / AI Engineer role — IIIT Nagpur, LeetCode Top 2.4%",
  "Open to SDE-1 / AI Engineer roles at {company} — Anand Shukla",
];

export async function generateUniqueSubject(companyName = "your company") {
  const chosen = DEFAULT_SUBJECTS[Math.floor(Math.random() * DEFAULT_SUBJECTS.length)];
  return chosen.replace("{company}", companyName);
}

function buildResumeContext() {
  return profile.rawResume;
}

function buildPrompt(recipientName = "", companyName = "your company") {
  return `You are writing a high-converting, personalized cold email for Anand Shukla applying for full-time Software Development Engineer (SDE-1) or AI Engineer roles.

Target Company: ${companyName}
Recipient: ${recipientName || "Hiring Team"}

Candidate Resume:
${buildResumeContext()}

Instructions:
1. Write a tailored, persuasive 3-to-4 paragraph cold email specifically pitched for ${companyName}.
2. Read Anand's full resume above and select the most relevant points:
   - If ${companyName} works on AI/ML/Data, highlight the Enterprise RAG & Agent Platform (LangGraph, Qdrant, RAGAS), AI Code Intelligence Agent (Tree-sitter), and Multimodal Document pipeline.
   - If ${companyName} is in FinTech, E-Commerce, or High-Scale Systems, highlight Synup (AWS Lambda, MySQL, Elasticsearch, ~40% failure reduction) and BrandX (Node.js, MongoDB, ~35% peak latency drop).
   - In all cases, showcase both backend engineering depth (6+ deployed systems) and algorithmic problem-solving (LeetCode Knight, rating 2006, Top 2.44%).
3. Structure:
   - Paragraph 1: Personalized hook about ${companyName} and why Anand is excited about their engineering/product.
   - Paragraph 2: High-impact backend experience at Synup and/or BrandX with quantitative metrics.
   - Paragraph 3: Advanced AI / Systems projects (Enterprise RAG with LangGraph, Code Intelligence with Tree-sitter, etc.) + LeetCode Knight (rating 2006, top 2.44%).
   - Paragraph 4: Clear call-to-action asking if they're open to a brief 10-minute call to explore full-time SDE-1 or AI Engineer opportunities.
4. Strict Rules:
   - Do NOT include any greeting (e.g. "Dear...", "Hi...") - greeting is rendered automatically.
   - Do NOT include any sign-off or name (e.g. "Best regards...", "Sincerely...", "Anand Shukla") - signature card is added automatically.
   - Keep total word count between 120 and 175 words. Punchy, authentic engineer voice, zero corporate fluff.
   - Use <b> tags around key companies, technologies, and metrics (e.g. <b>Synup</b>, <b>LangGraph</b>, <b>~40%</b>).
   - Do NOT use em dashes (—). Use hyphens (-) if needed.

Return ONLY a valid JSON object matching this schema:
{
  "subject": "A compelling 6-10 word email subject tailored to the company and role",
  "paragraphs": [
    "paragraph 1 text with optional <b> tags",
    "paragraph 2 text with optional <b> tags",
    "paragraph 3 text with optional <b> tags",
    "paragraph 4 text with optional <b> tags"
  ]
}`;
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
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b",
      temperature: 0.7,
      max_tokens: 900,
      response_format: { type: "json_object" },
    }),
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

function cleanAndParseResponse(rawText, companyName) {
  let cleaned = rawText
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    // If wrapping brackets were omitted or minor format issue, attempt extraction
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`Failed to parse AI JSON response: ${err.message}`);
    }
  }

  let subject = parsed.subject?.replace(/—/g, "-").replace(/`/g, "").trim();
  if (!subject || subject.length < 8) {
    subject = DEFAULT_SUBJECTS[Math.floor(Math.random() * DEFAULT_SUBJECTS.length)].replace(
      "{company}",
      companyName
    );
  }

  let paragraphs = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];

  // Filter out any paragraph that is just a greeting or sign-off
  paragraphs = paragraphs
    .map((p) =>
      p
        .replace(/—/g, "-")
        .replace(/`/g, "")
        .replace(/\n+/g, " ")
        .trim()
    )
    .filter((p) => {
      if (!p || p.length < 15) return false;
      const lower = p.toLowerCase();
      if (
        lower.startsWith("hi ") ||
        lower.startsWith("hello ") ||
        lower.startsWith("dear ") ||
        lower.startsWith("hey ")
      ) {
        return false;
      }
      if (
        lower.startsWith("best regards") ||
        lower.startsWith("sincerely") ||
        lower.startsWith("thanks,") ||
        lower.startsWith("thank you,") ||
        lower === "anand shukla"
      ) {
        return false;
      }
      return true;
    });

  if (paragraphs.length === 0) {
    throw new Error("AI returned empty paragraphs");
  }

  return { subject, paragraphs };
}

function getDefaultParagraphs(companyName) {
  return [
    `I came across your profile while exploring opportunities at ${companyName}, where the engineering problems you are solving are genuinely exciting.`,
    `I'm Anand, graduating from IIIT Nagpur (B.Tech '26) with backend SDE internships at <b>Synup</b> and <b>BrandX</b>. At Synup, I built serverless microservices with AWS Lambda, MySQL, and Elasticsearch, cutting pipeline failures by ~40% and resolving distributed race conditions. At BrandX, I engineered concurrent-safe booking services with Node.js and MongoDB, reducing peak API latency by ~35%. Across my work, I've built and deployed 6+ production backend systems.`,
    `On the AI side, I build production-grade systems including an <b>Enterprise RAG & Agent Platform</b> (Python, FastAPI, LangGraph, Qdrant, RAGAS), an <b>AI Code Intelligence Agent</b> (Tree-sitter AST parsing), and a <b>Multimodal Document Intelligence pipeline</b> (Vision LLMs, AWS S3/SQS/Lambda). Additionally, I'm a <b>LeetCode Knight</b> (Contest Rating 2006, Global Top 2.44%, 400+ problems solved).`,
    `I'm actively looking for full-time <b>SDE-1</b> or <b>AI Engineer</b> roles and would love to see if there's a strong fit with your team at ${companyName}. Would you be open to a brief 10-minute chat?`,
  ];
}

export async function generateEmail(recipientName = "", companyName = "your company") {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  const prompt = buildPrompt(recipientName, companyName);

  logger.info(`🤖 Generating dynamic email for ${recipientName || "Recipient"} at ${companyName}...`);

  let retries = 3;
  let backoff = 10000;
  let generatedSubject = "";
  let generatedParagraphs = [];

  while (retries >= 0) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing in environment variables.");
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

      const fetchPromise = fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 1000,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          const err = new Error("Gemini API timeout");
          err.status = 408;
          reject(err);
        }, 18000);
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
        const rawText = data.candidates[0].content.parts[0].text;
        const result = cleanAndParseResponse(rawText, companyName);
        generatedSubject = result.subject;
        generatedParagraphs = result.paragraphs;
        logger.info("✅ Gemini successfully generated tailored email from resume");
        break;
      } else {
        throw new Error("Unexpected Gemini API response format.");
      }
    } catch (error) {
      const isRateLimit =
        error.status === 429 || (error.message && error.message.includes("429"));

      if (isRateLimit) {
        logger.warn("Gemini rate limit hit. Falling back to Groq...");
        try {
          const groqRaw = await generateWithGroq(prompt);
          const result = cleanAndParseResponse(groqRaw, companyName);
          generatedSubject = result.subject;
          generatedParagraphs = result.paragraphs;
          logger.info("✅ Groq successfully generated tailored email as fallback");
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
            const result = cleanAndParseResponse(groqRaw, companyName);
            generatedSubject = result.subject;
            generatedParagraphs = result.paragraphs;
            logger.info("✅ Groq fallback succeeded after Gemini failure");
            break;
          } catch (groqError) {
            logger.error(`Groq fallback also failed: ${groqError.message}. Using default high-impact resume template.`);
            generatedSubject = DEFAULT_SUBJECTS[Math.floor(Math.random() * DEFAULT_SUBJECTS.length)].replace(
              "{company}",
              companyName
            );
            generatedParagraphs = getDefaultParagraphs(companyName);
            break;
          }
        }
        logger.warn(`Gemini API error (${error.message}). Retries left: ${retries}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  if (generatedParagraphs.length === 0) {
    generatedParagraphs = getDefaultParagraphs(companyName);
  }
  if (!generatedSubject) {
    generatedSubject = DEFAULT_SUBJECTS[Math.floor(Math.random() * DEFAULT_SUBJECTS.length)].replace(
      "{company}",
      companyName
    );
  }

  return {
    subject: generatedSubject,
    html: buildBeautifulTemplate(greeting, generatedParagraphs),
  };
}

function buildBeautifulTemplate(greeting, paragraphs) {
  const bodyHtml = paragraphs
    .map((para) => `<p style="margin:0 0 16px 0;line-height:1.75;color:#374151;">${para}</p>`)
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