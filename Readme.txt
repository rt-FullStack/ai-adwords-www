AI ADWORDS MANAGER
===================

Project: ai-adwords-www
Version: 1.0.0
Framework: Next.js 15.0.0

DESCRIPTION
-----------
AI AdWords Manager is a Next.js application for managing Google Ads campaigns 
with AI-powered enhancements. This tool automates ad generation, structure 
analysis, and client management for Google Ads.

KEY FEATURES
------------
• AI-Powered Ad Generation
• Client Management Dashboard
• CSV Import/Export Functionality
• Google Ads API Integration
• Duplicate Detection System
• Responsive UI with Tailwind CSS
• Firebase Authentication & Database

PROJECT STRUCTURE (MAIN FOLDERS)
---------------------------------
ai-adwords-www/
├── src/app/              - Next.js App Router pages
│   ├── api/              - API routes
│   ├── [clientName]/     - Dynamic client pages
│   ├── account/          - User account
│   └── editor/           - Ad editor
├── src/components/       - React components
├── public/              - Static assets
├── firebase/            - Firebase config
└── data/                - Data utilities

INSTALLATION
------------
1. Clone repository
2. Run: npm install
3. Create .env.local with required variables
4. Run: npm run dev

REQUIRED ENV VARIABLES
----------------------
GOOGLE_ADS_CLIENT_ID
GOOGLE_ADS_CLIENT_SECRET
FIREBASE_API_KEY

TECH STACK
----------
• Next.js 15.0.0
• React
• Firebase
• Tailwind CSS
• Google Ads API
• Vercel (Deployment)


LAST UPDATED
------------
2025-12-18