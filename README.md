# AI-Powered Applicant Tracking System (ATS)

## Overview
An end-to-end, AI-powered Applicant Tracking System designed for recruiters to efficiently manage job postings, applicants, resumes, and interviews. The system leverages advanced AI (OpenAI GPT/Whisper) for resume matching, interview audio analysis, chat summarization, and bias detection, streamlining the recruitment process and improving hiring outcomes.

---

## Key Features
- **Authentication**: Secure recruiter registration, login, JWT-based session management.
- **Job Management**: CRUD for job posts, advanced filtering, and search.
- **Applicant Management**: Track applicants, upload resumes, manage statuses.
- **Resume Upload & Parsing**: Supports PDF/DOCX, extracts and stores text for AI processing.
- **AI Resume Matching**: Uses OpenAI embeddings and keyword extraction for best-fit ranking.
- **Interview Audio Processing**: Upload audio, transcribe with Whisper, summarize and score with GPT.
- **Chat Summarization**: Summarize recruiter-applicant chats using GPT.
- **Bias Detection**: Analyze job descriptions, feedback, and interviews for bias using AI.
- **Modern UI**: Built with React, Tailwind CSS, Radix UI, and Redux Toolkit.

---

### Deployed on:  https://talent-tracker-roan.vercel.app/

---

## Screenshots
![screencapture-localhost-8080-2025-06-02-21_07_47](https://github.com/user-attachments/assets/286dea3b-5666-4177-b35e-2620cf91e958)

![screencapture-localhost-8080-dashboard-2025-06-02-21_06_57](https://github.com/user-attachments/assets/1e93db13-045e-4665-8790-3588829e529e)
---

## Folder Structure
```
AI-Powered-Applicant-Tracking-System/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── dist/           # Compiled JS output
│   ├── uploads/        # Uploaded files
│   ├── logs/           # Log files
│   ├── package.json
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── config/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── slices/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── todo.md             # Product requirements & implementation phases
├── ats-flowchart.html  # System flowchart
└── README.md           # Project documentation
```

---

## Technologies Used
- **Backend**: Node.js, Express, TypeScript, MongoDB (Mongoose), OpenAI API, JWT, Multer, Joi, Winston
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Redux Toolkit, React Query, Radix UI, Axios
- **AI/ML**: OpenAI GPT (resume matching, chat/interview summarization, bias detection), Whisper (audio transcription)

---

## Installation & Usage

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+ recommended)
- MongoDB Atlas account (or local MongoDB)
- OpenAI API key

### 1. Backend Setup
```bash
cd backend
npm install
# Create a .env file based on .env.example (set MongoDB URI, OpenAI key, JWT secrets, etc.)
npm run build
npm run dev   # For development (auto-reloads with nodemon)
# or
npm start     # For production (runs compiled JS)
```

#### Backend Scripts (from package.json)
- `npm run build`   – Compile TypeScript to JS
- `npm run dev`     – Build and run with nodemon (dev mode)
- `npm start`       – Run compiled server (prod mode)

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Start Vite dev server (http://localhost:5173)
# or
npm run build    # Build for production
npm run preview  # Preview production build
```

#### Frontend Scripts (from package.json)
- `npm run dev`      – Start development server
- `npm run build`    – Build for production
- `npm run preview`  – Preview production build
- `npm run lint`     – Lint codebase

---

## Environment Variables
- See `backend/src/config/index.ts` for all required backend environment variables (MongoDB URI, JWT secrets, OpenAI keys, etc.).
- Frontend may require API base URL configuration (see `frontend/src/config/`).

---

## License
This project is licensed under the ISC License. 
