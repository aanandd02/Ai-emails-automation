import genAI from "../config/geminiaiConfig.js";

// ✨ Random style variations for human-like tone
const STYLES = [
  "confident and concise",
  "friendly but professional",
  "polite and enthusiastic",
  "formal yet approachable",
  "warm and engaging",
];

// 🧠 Generate unique subject each time
export async function generateUniqueSubject(recipientName = "") {
  const tones = [
    `Application for Backend Developer Role – ${recipientName}`,
    `Exploring Backend Opportunities | ${recipientName}`,
    `Introduction – ${recipientName}, Backend Engineer`,
    `Backend Developer Application | ${recipientName}`,
    `${recipientName} | Backend Development Enthusiast`,
  ];
  return tones[Math.floor(Math.random() * tones.length)];
}
// 📨 Generate AI-crafted email content
export async function generateEmail(recipientName = "") {
  const style = STYLES[Math.floor(Math.random() * STYLES.length)];
  const greeting = recipientName ? `Dear ${recipientName},` : "Dear HR,";

  const prompt = `
Write a short 130-word internship/job application email for a Backend Developer role.
Do NOT mention any job platform, advertisement, or where I found the job.
Tone: ${style}.
Greeting: "${greeting}"
Mention I'm Anand Shukla, a Final year student at IIIT Nagpur, experienced with Node.js, Express.js, MongoDB, and REST APIs.
Mention my internship at BrandX (optimized APIs and authentication), and projects:
1. CodeSavantAI (LangChain + Gemini)
2. MealStack (secure backend).
End politely with thanks and confidence.
Do NOT include my name or contact details in the main body. 
Do NOT add 'Sincerely' or any sign-off lines — end exactly at that point.
Output plain text only (no markdown or emojis).
write final year in good way not in small letter Final year
`;

  const myName = "Anand Shukla";
  const contact = {
    phone: "+91-9076823328",
    email: "aanandd9076@gmail.com",
    portfolio: "https://anand-shukla02.onrender.com/",
    linkedin: "https://www.linkedin.com/in/aanandd02",
  };

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return buildBeautifulTemplate(text, { myName, ...contact });
  } catch (error) {
    console.error("⚠️ Gemini failed, fallback...", error.message);
    const fallback = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await fallback.generateContent(prompt);
    const text = result.response.text();
    return buildBeautifulTemplate(text, { myName, ...contact });
  }
}

/**
 * 📱 Responsive, elegant HTML email (spam-safe)
 */
function buildBeautifulTemplate(
  emailText,
  { myName, phone, email, portfolio, linkedin}
) {
  const body = emailText
    .replace(/[*_`#>-]/g, "")
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
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        background: #f8f9fa;
        margin: 0; padding: 0;
      }
      .container {
        max-width: 600px;
        background: #fff;
        margin: 25px auto;
        border-radius: 12px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.08);
        padding: 28px 32px;
      }
      h2 {
        color: #202124;
        font-size: 18px;
        font-weight: 600;
      }
      p { color: #202124; line-height: 1.6; font-size: 15px; }
      a { color: #1a73e8; text-decoration: none; }
      .footer {
        font-size: 13px;
        color: #777;
        border-top: 1px solid #eee;
        margin-top: 20px;
        padding-top: 10px;
      }
      @media (max-width: 480px) {
        .container { padding: 20px; }
        p, a { font-size: 14px; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Application for Backend Developer Role</h2>
      <hr>
      <p>${body}</p>
      <p>
        Best regards,<br>
        <strong>${myName}</strong><br>
        📞 <a href="tel:${phone}">${phone}</a><br>
        📧 <a href="mailto:${email}">${email}</a><br>
        🌐 <a href="${portfolio}">Portfolio</a> |
        <a href="${linkedin}">LinkedIn</a> |
        📄 <a href="https://drive.google.com/file/d/1KECDLZw9SbXcVTbGBC7mBS4waAWJMIcf/view?usp=sharing">Resume</a>
      </p>
    </div>
  </body>
  </html>
  `;
}
