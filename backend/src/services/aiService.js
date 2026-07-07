import logger from "../utils/logger.js";

const MODEL = "gemini-2.5-flash";

const STYLES = [
  "confident and concise",
  "friendly but professional",
  "warm and engaging",
  "polite and enthusiastic",
];

const SUBJECTS = [
  "AI Engineer | RAG · AI Agents · LangChain · Node.js | LeetCode Knight (2006)",
  "Backend + AI Engineer | LLMs · Vector DBs · AWS Serverless | Anand Shukla",
  "AI Engineer (Backend) | RAG Pipelines · MCP · LangChain | IIIT Nagpur '26",
  "SDE-1 / AI Engineer | AI Agents · Node.js · AWS Lambda | LeetCode Knight",
  "Actively Exploring AI/Backend Roles | RAG · Agents · LangChain · Node.js",
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
      model: "llama-3.3-70b-versatile",
      temperature: 0.75,
      max_tokens: 1500
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
  
  const prompt = `
Write an email body matching this EXACT format.

Company Name: ${companyName}

INSTRUCTIONS:
1. Generate a single SHORT, professional sentence to replace "[AI_COMPLIMENT]" about the company's work (e.g. "the work you all are doing at the intersection of AI and product development is genuinely exciting."). If the company name is very generic (like "your company"), just write "the work you are doing is genuinely exciting."
2. Output EXACTLY the text below, replacing [Company Name] and [AI_COMPLIMENT]. Do NOT use Markdown. Do NOT use bullet points. Do NOT use HTML tags. Do NOT change any other part of the text.

I came across your profile while exploring opportunities at ${companyName} — [AI_COMPLIMENT]

I'm Anand, a recent graduate from IIIT Nagpur (2026). I've worked as a Backend Intern at Synup, where I optimized MySQL transactions and built atomic reservation logic using Node.js and AWS Lambda. Before that at BrandX, I worked on MongoDB-based data pipelines.

On the AI side, I'm currently exploring RAG pipelines, AI Agents, and MCP — building hands-on projects as I go. I'm also a LeetCode Knight (Global top 2.44%, rating 2006).

I'm actively looking for SDE-1 or AI Engineer roles and would love to explore if there's a fit at ${companyName}. Would you be open to a quick 10-minute call?
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
    logger.info(`🤖 Using Gemini model: ${MODEL}`);
    logger.info(`👤 Recipient: ${recipientName || "unknown"}`);

    let text = "";
    let retries = 3;
    let backoff = 10000; // start with 10s delay

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
              maxOutputTokens: 1500,
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
          text = data.candidates[0].content.parts[0].text;
          break; // Success
        } else {
          throw new Error("Unexpected API response format.");
        }

      } catch (error) {
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
          logger.warn(`Gemini rate limit hit. Falling back to Groq...`);
          try {
            text = await generateWithGroq(prompt);
            logger.info("✅ Groq successfully generated text as fallback");
            break; // Success with Groq
          } catch (groqError) {
            logger.error(`Groq fallback failed: ${groqError.message}`);
            // If Groq also fails, we fall back to the original wait logic
            let waitSeconds = backoff / 1000;
            const rlError = new Error("Both Gemini and Groq (fallback) failed due to rate limit/errors");
            rlError.isRateLimit = true;
            rlError.waitSeconds = waitSeconds;
            
            backoff *= 2; // exponential backoff for next iteration
            throw rlError;
          }
        } else {
          retries--;
          if (retries < 0) {
            throw error;
          }
          logger.warn(`Gemini API error (${error.message}). Retries left: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    logger.info("✅ Email generated");

    return {
      subject: SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)],
      html: buildBeautifulTemplate(greeting, text, { myName, ...contact }),
    };
  } catch (error) {
    logger.error("❌ Gemini generation failed:", error.message);
    if (error.isRateLimit) {
      throw error;
    }
    throw new Error(`Email content generation failed: ${error.message}`);
  }
}

function buildBeautifulTemplate(
  greeting,
  emailText,
  { myName, phone, email, portfolio, resume }
) {
  let body = emailText;
  
  // Extract content if wrapped in code blocks
  const codeBlockMatch = body.match(/```(?:html|markdown|text)?\n?([\s\S]*?)```/i);
  if (codeBlockMatch) {
    body = codeBlockMatch[1];
  }

  // Clean up and split into paragraphs
  body = body
    .replace(/`/g, "")
    .replace(/\r/g, "")
    .trim();

  // Split on double newlines (paragraph breaks) and wrap each in <p> with spacing
  const paragraphs = body.split(/\n{2,}/);
  body = paragraphs
    .map(para => {
      // Within a paragraph, replace single newlines with <br>
      const inner = para.replace(/\n/g, "<br>");
      return `<p style="margin:0 0 14px 0;">${inner}</p>`;
    })
    .join("");

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

  <!-- Signature -->
  <table style="margin-top:20px;padding-top:16px;border-top:1px solid #e8e8e8;width:100%;border-collapse:collapse;">
    <tr>
      <td style="width:44px;vertical-align:middle;padding-right:12px;">
        <table style="border-collapse:collapse;"><tr><td style="width:40px;height:40px;border-radius:50%;background:#dbeafe;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#1d4ed8;letter-spacing:0.5px;line-height:40px;">AS</td></tr></table>
      </td>
      <td style="vertical-align:middle;">
        <div style="font-size:14px;font-weight:600;color:#111;line-height:1.4;">${myName}</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">
          SDE &nbsp;·&nbsp; IIIT Nagpur &nbsp;|&nbsp;
          <a href="tel:${phone}" style="color:#888;text-decoration:none;">${phone}</a> &nbsp;|&nbsp;
          <a href="mailto:${email}" style="color:#888;text-decoration:none;">${email}</a>
        </div>
        <div style="margin-top:8px;">
          <a href="${portfolio}" style="display:inline-block;padding:4px 12px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:4px;font-size:11px;font-weight:500;margin-right:6px;">Portfolio</a>
          <a href="${resume}" style="display:inline-block;padding:4px 12px;background:#0a66c2;color:#ffffff;text-decoration:none;border-radius:4px;font-size:11px;font-weight:500;">Resume</a>
        </div>
      </td>
    </tr>
  </table>

</div>

</body>
</html>
`;
}