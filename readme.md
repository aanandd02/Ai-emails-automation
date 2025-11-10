# 🤖 AI Email Automation System

An intelligent email automation tool that uses **Google Gemini AI**, **Google Sheets**, and **Node.js** to send personalized emails automatically.  
Built by **Anand Shukla** 🚀

---

## ✨ Overview

This project automates the process of sending job or internship application emails.  
It reads contact details from **Google Sheets**, generates unique and human-like email content using **Gemini AI**, attaches your resume, and sends the email through **Gmail** — all automatically, with smart delays and duplicate protection.

---

## 🧠 Key Features

✅ **AI-Generated Content** – Personalized, short, and professional emails using Google Gemini  
✅ **Google Sheet Integration** – Reads names, emails, and updates "Sent"/"Failed" status  
✅ **Automated Gmail Sending** – Uses Nodemailer + App Password (secure)  
✅ **Duplicate Protection** – Tracks previously sent emails in `sentEmails.json`  
✅ **Human-Like Behavior** – Random delays between emails (30–60s)  
✅ **Attachment Support** – Sends resume or any other file  
✅ **Beautiful HTML Template** – Clean and professional design  

---

## 🏗️ Project Structure

```

ai-email-automation/
│
├── src/
│   ├── config/
│   │   ├── geminiaiConfig.js
│   │   ├── mailConfig.js
│   │   └── google-credentials.json   ← ⚠️ Do not upload
│   ├── controllers/
│   │   └── emailController.js
│   ├── services/
│   │   ├── aiService.js
│   │   ├── mailService.js
│   │   ├── googleSheetService.js
│   │   └── sentEmailService.js
│   └── utils/
│       └── delay.js
│
├── data/
│   ├── sentEmails.json
│   └── Anand_Shukla.pdf
│
├── .env
├── .gitignore
├── index.js
├── package.json
└── README.md

````

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository
```bash
git clone https://github.com/aanandd02/ai-email-automation.git
cd ai-email-automation
````

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Gmail Credentials
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASS=your_gmail_app_password
```

> ⚠️ Never commit `.env` file to GitHub!

---

### 4️⃣ Setup Google Sheets API

* Go to [Google Cloud Console](https://console.cloud.google.com/)
* Create a **Service Account** and enable **Google Sheets API**
* Download the JSON credentials and save it here:

  ```
  src/config/google-credentials.json
  ```
* Share your target Google Sheet with the **service account email**
  (e.g. `sheets-service-account@email-automation-xxxx.iam.gserviceaccount.com`)

---

### 5️⃣ Prepare Google Sheet

Example format:

| Name           | Email                                       | Status |
| -------------- | ------------------------------------------- | ------ |
| HR Manager     | [hr@company.com](mailto:hr@company.com)     |        |
| Recruiter John | [john@startup.com](mailto:john@startup.com) | Sent   |

* Keep the sheet name as `Sheet1`
* Update the Sheet ID inside `googleSheetService.js`

---

### 6️⃣ Run the Application

```bash
npm start
```

The script will:

* Fetch all users from Google Sheet
* Skip already sent entries
* Generate a unique subject + email using Gemini
* Send it via Gmail with resume
* Update Google Sheet status automatically

---

## 🧩 Tech Stack

| Technology            | Purpose                  |
| --------------------- | ------------------------ |
| **Node.js**           | Backend runtime          |
| **Nodemailer**        | Sending emails via Gmail |
| **Google Gemini AI**  | AI text generation       |
| **Google Sheets API** | Read/write contact data  |
| **dotenv**            | Secure config handling   |
| **fs / path**         | Local data persistence   |

---

## 📜 Example AI-Generated Email (Preview)

> *Dear HR,*
> 
> I am Anand Shukla, a final-year B.Tech student at IIIT Nagpur, with hands-on experience in Node.js, Express.js, MongoDB, and REST APIs.
> During my internship at BrandX, I optimized backend authentication and API performance.
> My key projects include CodeSavantAI (LangChain + Gemini) and MealStack (secure backend architecture).
> 
> I’d be delighted to bring my skills and curiosity to your development team.
> 
> Thank you for your time and consideration.

---

## 🛡️ Security Checklist

**Do NOT commit these files to GitHub:**

```
.env
src/config/google-credentials.json
data/sentEmails.json
data/*.pdf
```

These files should already be listed in `.gitignore`.
If not, add this:

```bash
node_modules/
.env
src/config/google-credentials.json
data/sentEmails.json
data/*.pdf
```

---

## 🔮 Future Improvements

* 🌐 Web dashboard to view sent status & analytics
* 💬 Custom AI tone selector (Formal, Friendly, etc.)
* 📦 Email batching with progress bar
* 🔁 Automated follow-up sequence

---

## 👨‍💻 Author

**Anand Shukla**
Backend Developer | Final Year @ IIIT Nagpur

📧 [aanandd9076@gmail.com](mailto:aanandd9076@gmail.com)
🔗 [Portfolio](https://anand-shukla02.onrender.com)
💼 [LinkedIn](https://www.linkedin.com/in/aanandd02)
💻 [GitHub](https://github.com/aanandd02)

---

## ⚖️ License

MIT License © 2025 Anand Shukla
Free to use and modify with attribution.
