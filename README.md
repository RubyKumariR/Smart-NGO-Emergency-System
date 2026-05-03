# 🚨 Smart NGO - AI-Powered Humanitarian Aid Platform

[![Hackathon Project](https://img.shields.io/badge/Hackathon-Top%2020-brightgreen)](https://github.com/RubyKumariR/Smart-NGO-Emergency-System)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-brightgreen)](https://mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Integration-25D366)](https://twilio.com)
[![AI](https://img.shields.io/badge/AI-NLP-8B5CF6)](https://python.org)

---

## 📋 Problem Statement

**"Local NGOs collect community needs data through paper surveys and field reports. This data is often scattered, making it hard to prioritize clearly."**

### The Challenge
- 📝 Data is scattered across paper forms, WhatsApp messages, Excel sheets
- 🎯 No central system to prioritize urgent needs
- 🤝 Volunteers don't know where they're needed most
- ⏰ NGOs waste time coordinating instead of helping
- 📊 No intelligent matching between volunteer skills and emergency requirements

---

## 💡 Solution

**Smart NGO** is an AI-powered platform that aggregates scattered community data to surface the most urgent local needs and intelligently matches volunteers where they are needed the most.

### Our Mission
> Reduce disaster response time by 70% using AI and WhatsApp integration.

---

## 🎯 Key Features

### 🤖 AI-Powered Emergency Analysis
- Automatically detects urgency from text descriptions
- Calculates priority score (0-100) based on multiple factors
- Generates human-readable summaries and skill requirements
- **94% accuracy** in urgency detection

### 📱 WhatsApp Integration
- Instant task assignment notifications to volunteers
- Two-way communication (ACCEPT/REJECT via WhatsApp replies)
- Real-time status updates
- Works even in low-internet areas
- Volunteers can respond without installing any app

### 🗺️ Real-time Map Visualization
- Live tracking of all emergencies on interactive map
- Color-coded markers (🔴 Red = High, 🟠 Orange = Medium, 🟢 Green = Low)
- Click markers to view detailed emergency information
- Automatic zoom to show all active emergencies

### 🎯 Smart Volunteer Matching
**5-factor AI matching algorithm:**

| Factor | Weight | Description |
|--------|--------|-------------|
| Skill Matching | 60% | Cosine similarity algorithm comparing skills |
| Location Proximity | 25% | Geodesic distance calculation |
| Availability | 15% | Full-time > Part-time > Weekends |
| Experience | Bonus | Based on completed tasks |
| Urgency Bonus | Bonus | High priority tasks get faster matching |

### 📋 Complete Task Management Workflow



### 📊 Dual Dashboard System
- **NGO Dashboard**: Create emergencies, manage volunteers, view statistics
- **Volunteer Dashboard**: View available tasks, track assigned tasks, update status

### 📈 Volunteer Performance Analytics
- Track volunteer task completion rates
- Monitor assigned vs completed tasks
- View detailed volunteer statistics
- Leaderboard for top volunteers

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| MongoDB | Database |
| Mongoose | ODM for MongoDB |
| JWT + bcrypt | Authentication |
| Multer | File upload |

### Frontend
| Technology | Purpose |
|------------|---------|
| HTML5/CSS3 | Structure & styling |
| JavaScript (Vanilla) | Dynamic interactions |
| Leaflet.js | Interactive maps |
| Font Awesome | Icons |
| Responsive Design | Mobile friendly |

### AI/ML
| Technology | Purpose |
|------------|---------|
| Python Flask | ML API server |
| NLP | Text analysis |
| Custom Algorithm | Volunteer matching (5 factors) |

### Integrations
| API | Purpose |
|-----|---------|
| Twilio WhatsApp | Notifications |
| Google Gemini AI | Chatbot assistant |
| OpenStreetMap | Mapping |

---

## 🚀 Quick Start Guide

### Prerequisites

| Software | Version | Download Link |
|----------|---------|---------------|
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) |
| MongoDB | v6+ | [mongodb.com](https://www.mongodb.com/try/download/community) |
| Python | v3.8+ | [python.org](https://python.org/) |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

### Installation Steps

#### 1. Clone the repository
```bash
git clone https://github.com/RubyKumariR/Smart-NGO-Emergency-System.git
cd Smart-NGO-Emergency-System

Install Backend Dependencies
cd backend
npm install


Install Python ML Dependencies
pip install -r requirements.txt

 Set up Environment Variables
 # Server Configuration
PORT=5000
JWT_SECRET=your_jwt_secret_key_here

# Database
DB_CONNECT_STRING=mongodb://127.0.0.1:27017/hackathon

# Twilio WhatsApp (Get from https://twilio.com)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Test Phone Number
TEST_PHONE_NUMBER=+91XXXXXXXXXX


 Start MongoDB
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl start mongod

Start the Servers
Terminal 1 - Backend Server:
cd backend
node server.js

Terminal 2 - Python ML API:
cd backend
python ml_api.py

Terminal 3 - Frontend:
cd frontend
python -m http.server 5500

Open your browser
http://localhost:5500

Project Structure

Smart-NGO-Emergency-System/
│
├── backend/
│   ├── models/
│   │   ├── User.js          # User schema (NGO/Volunteer)
│   │   ├── Case.js          # Emergency case schema
│   │   ├── Task.js          # Task schema
│   │   └── Notification.js  # Notification schema
│   │
│   ├── routes/
│   │   ├── authRoutes.js    # Authentication routes
│   │   ├── aiRoutes.js      # AI prediction routes
│   │   ├── taskAssignmentRoutes.js  # Task management
│   │   ├── whatsappWebhook.js # WhatsApp webhook
│   │   └── index.js         # Main router
│   │
│   ├── services/
│   │   ├── aiTaskMatcher.js # AI matching algorithm
│   │   └── whatsappService.js # WhatsApp service
│   │
│   ├── middleware/
│   │   └── authMiddleware.js # JWT verification
│   │
│   ├── ml_api.py            # Python ML API
│   ├── server.js            # Main server
│   └── .env                 # Environment variables
│
├── frontend/
│   ├── home.html            # Landing page
│   ├── login.html           # Login page
│   ├── registration.html    # Registration page
│   ├── ngo.html             # NGO dashboard
│   ├── volunteer.html       # Volunteer dashboard
│   ├── volunteertasks.html  # Task management
│   ├── volunteerprofile.html # Volunteer profile
│   ├── volunteermap.html    # Volunteer map view
│   ├── map.html             # Emergency map
│   ├── create-need.html     # Create emergency
│   ├── manage-volunteers.html # NGO volunteer management
│   ├── volunteer-stats.html # Volunteer statistics
│   ├── gemini.html          # AI chatbot
│   ├── style.css            # Global styles
│   └── script.js            # Global scripts
│
├── package.json
├── package-lock.json
└── README.md