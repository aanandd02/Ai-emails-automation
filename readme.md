# AI HR Email Automation

Automates personalized job or internship outreach emails using:
- Google Sheets as the contact source
- Groq LLM for dynamic email generation
- Gmail (Nodemailer) for delivery
- Local JSON storage for duplicate prevention

## What It Does
- Reads `Name`, `Email`, and `Status` from Google Sheet columns `A:C`
- Skips rows already marked as `Sent`
- Skips recipients already present in local sent history
- Generates a personalized subject and HTML email body
- Sends email via Gmail App Password
- Updates Google Sheet status to `Sent` or `Failed`
- Waits a randomized delay between sends to mimic human pacing

## Tech Stack
- Node.js (ESM)
- Groq SDK
- Google Sheets API (`googleapis`)
- Nodemailer
- dotenv

## Project Structure
```text
.
├── index.js
├── package.json
├── src
│   ├── config
│   │   ├── groqConfig.js
│   │   └── mailConfig.js
│   ├── controllers
│   │   └── emailController.js
│   ├── services
│   │   ├── aiService.js
│   │   ├── googleSheetService.js
│   │   ├── mailService.js
│   │   └── sentEmailService.js
│   └── utils
│       └── delay.js
└── data
    └── sentEmails.json (auto-created)
```

## Prerequisites
- Node.js 18+
- Gmail account with 2FA enabled
- Gmail App Password
- Groq API key
- Google Cloud service account with Sheets API enabled

## Environment Variables
Create a `.env` file in project root:

```env
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASS=your_gmail_app_password
GROQ_API_KEY=your_groq_api_key
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_SHEET_NAME=Sheet1
```

Notes:
- `GOOGLE_SHEET_NAME` is optional (defaults to `Sheet1`).
- Missing required variables will fail fast on startup.

## Google Sheets Setup
1. Enable Google Sheets API in Google Cloud.
2. Create a Service Account.
3. Download service account JSON credentials.
4. Place it at:

```text
src/config/google-credentials.json
```

5. Share your target Google Sheet with the service account email.
6. Ensure sheet format:

| Column A | Column B | Column C |
| --- | --- | --- |
| Name | Email | Status |

## Installation
```bash
npm install
```

## Run
Production run:
```bash
npm start
```

Development run (auto-reload):
```bash
npm run dev
```

## Execution Flow
1. App starts from `index.js`.
2. Controller fetches sheet rows and filters valid users.
3. For each recipient:
   - Check sheet status and local sent-history
   - Generate subject + email body with Groq
   - Send email via Nodemailer
   - Update sheet status (`Sent` or `Failed`)
   - Persist recipient in `data/sentEmails.json`
4. Continue until all valid rows are processed.

## Duplicate Protection
Duplicate prevention happens at two levels:
- Google Sheet row status (`Sent`)
- Local store: `data/sentEmails.json` (emails normalized to lowercase)

If `data/sentEmails.json` is missing, it is created automatically.

## Security Checklist
- Never commit `.env`
- Never commit `src/config/google-credentials.json`
- Never commit personal data files from `data/`
- Rotate keys immediately if exposed

Recommended `.gitignore` entries:
```gitignore
node_modules/
.env
src/config/google-credentials.json
data/sentEmails.json
data/*.pdf
```

## Troubleshooting
### `Missing required env var ...`
One or more required `.env` values are absent.

### `Missing Google credentials file ...`
`src/config/google-credentials.json` is missing or mislocated.

### Gmail authentication errors
Use a valid App Password (not your Gmail account password).

### Google API DNS/network errors
Check local internet/DNS/firewall/VPN settings.

## NPM Scripts
- `npm start`: run with `node index.js`
- `npm run dev`: run with `nodemon index.js`

## License
ISC
