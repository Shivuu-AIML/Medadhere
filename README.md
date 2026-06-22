# MedAdhere 💊

AI-powered medication adherence and safety assistant that helps users manage medications, track adherence, detect potential drug interactions, and receive personalized health insights.

---

## Overview

Medication non-adherence is a major healthcare challenge that can lead to missed treatments, reduced effectiveness, and preventable complications.

MedAdhere provides a simple and intelligent platform where users can:

- Track medications and schedules
- Monitor adherence and health score
- Detect possible drug interactions
- Receive AI-generated health insights
- View adherence streaks and safety status
- Manage medication history in one dashboard

---

## Features

### Authentication
- User Registration
- Secure Login
- User-specific medication data

### Medication Management
- Add medications
- Dosage tracking
- Schedule reminders
- Medication timeline

### Adherence Tracking
- Health Score calculation
- Adherence percentage
- Adherence streak monitoring
- Weekly summary

### Medication Safety
- Drug interaction detection
- Risk classification
- Plain-language safety summaries
- Evidence-based warning display

### AI Health Insights
- AI-generated adherence analysis
- Personalized medication insights
- Easy-to-understand health recommendations

### Upcoming Features
- Symptom Journal
- PDF Doctor Reports
- Real Email Notifications
- Multiple Daily Medication Schedules
- Advanced AI Health Assistant

---

## Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript (Vanilla)

### Backend
- Node.js
- Express.js

### Database
- MongoDB
- Mongoose

### Authentication
- JWT Authentication
- Password Hashing

### AI Integration
- OpenAI API

---

## Project Structure

```bash
MedAdhere/
│
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── logo/
│
├── models/
│   ├── User.js
│   ├── Medication.js
│   └── AdherenceLog.js
│
├── routes/
│   ├── auth.js
│   ├── medications.js
│   └── safety.js
│
├── middleware/
│   └── auth.js
│
├── server.js
├── package.json
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/your-username/medadhere.git
cd medadhere
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

OPENAI_API_KEY=your_openai_api_key
```

### Run Application

```bash
npm start
```

Development mode:

```bash
npm run dev
```

---

## How It Works

1. User registers and logs in.
2. Medication schedules are added.
3. Adherence data is tracked over time.
4. Safety checks analyze medication combinations.
5. AI generates personalized health insights.
6. Dashboard displays health score, streaks, and warnings.

---

## Future Roadmap

### Phase 1
- Email notifications
- Multiple medication schedules per day
- Better adherence analytics

### Phase 2
- AI Symptom Journal
- Symptom-to-medication correlation
- Side-effect tracking

### Phase 3
- Doctor-ready PDF reports
- Health data exports
- Healthcare provider integration

---

## Problem Statement

Many users forget medications or struggle to understand potential medication risks.

MedAdhere aims to improve medication adherence and patient safety through intelligent reminders, interaction monitoring, and AI-powered health insights.

---

## Demo

### User Journey

- Register/Login
- Add Medication
- Check Safety
- Track Adherence
- View AI Insights
- Monitor Health Score

---

## Team

Built during **Elevate 2026 Hackathon** 🚀

**Project:** MedAdhere  
**Category:** Healthcare + AI

---

## License

MIT License

Feel free to use, modify, and contribute.
