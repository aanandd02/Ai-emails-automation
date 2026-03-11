# AI HR Email Automation

Automates personalized job outreach emails using Google Sheets, Groq LLM, and Gmail with duplicate protection.

## Stack
- Backend: Node.js (ESM), Express, Groq SDK, Google Sheets API, Nodemailer, dotenv
- Frontend: React + Vite

## Quickstart
1) Backend install & env  
```bash
cd backend
npm install
```
Create `backend/.env`:
```env
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASS=your_gmail_app_password
GROQ_API_KEY=your_groq_api_key
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_SHEET_NAME=Sheet1
BASIC_AUTH_USER=your_username
BASIC_AUTH_PASS=your_password
# Optional: LOG_TO_CONSOLE=true
```
Place service account creds at `backend/src/config/google-credentials.json` and share the sheet with that service account. Sheet columns: `Name | Email | Status`.

2) Run backend  
```bash
cd backend
npm start
```

3) Frontend install & run  
```bash
cd frontend
npm install
npm run dev
```
By default the UI calls `http://localhost:3000`. To override, set `VITE_API_BASE` in `frontend/.env` and restart `npm run dev`.

4) Login  
Use the BASIC_AUTH_USER / BASIC_AUTH_PASS you set in `backend/.env`.

## How it works
1. Reads rows from Google Sheet (A:C).  
2. Skips rows whose sheet status is `Sent`.  
3. Groq generates subject + HTML body.  
4. Sends via Gmail App Password.  
5. Updates sheet status to `Sent` or `Failed`, waits with human-like delays.  

## Duplicate protection
- Sheet status `Sent`

## Security
- Do not commit `.env`, credentials, or data exports.
- Rotate keys if exposed.

## Scripts
- Backend: `npm start`
- Frontend: `npm run dev`

## Troubleshooting
- API unreachable: ensure backend on port 3000 or set `VITE_API_BASE`.
- Missing env/creds: verify `.env` and `backend/src/config/google-credentials.json`.
- Gmail auth errors: use a valid App Password.

## License
ISC
