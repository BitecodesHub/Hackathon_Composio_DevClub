# AI Recruiter Copilot

This project parses resumes from Gmail, enriches candidate data via the Gemini API, schedules interviews in Google Calendar, and updates a pipeline in Google Sheets or Notion.

## Project Setup

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd <your-repo-folder>
```

### 2. Create and activate a virtual environment
```bash
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows
```

### 3. Install required packages
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Setting up Gemini API Key
1. Go to [Google AI Studio API Keys](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Copy the key
4. Export it in terminal:
```bash
export GEMINI_API_KEY="YOUR_NEW_GEMINI_KEY"
```
5. Alternatively, you can hardcode it in `gemini_parser.py` (not recommended for production)

### 5. Configure Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing project
3. Enable **Gmail API**
4. Create OAuth credentials and download `credentials.json`
5. Place `credentials.json` in the project root

### 6. Configure Google Sheets / Notion (optional)
- For Google Sheets:
  - Enable **Google Sheets API**
  - Create OAuth credentials
- For Notion:
  - Create an integration token
  - Share target databases with the integration

## Running the Project

### 1. Parse resumes using Gemini
```bash
python gemini_parser.py
```

### 2. Fetch resumes from Gmail (if implemented separately)
```bash
python fetch_resumes.py
```

### 3. Stepwise implementation
- Step 1: Gmail Integration (`step1_gmail.py`)
- Step 2: Gemini Parsing (`step2_gemini_parser.py`)
- Step 3: Update Sheets/Notion (`step3_pipeline_update.py`)
- Step 4: Schedule interviews (`step4_calendar.py`)

## Notes
- Ensure `GEMINI_API_KEY` is set before running scripts
- Wait a few minutes after enabling APIs in Google Cloud for propagation
- Use virtual environment to avoid conflicts

## Troubleshooting
- `403 SERVICE_DISABLED`: Your Gemini API key is tied to a project where the Generative Language API is not enabled. Create a new key in AI Studio or ask project owner to enable API.
- Gmail OAuth errors: Ensure `credentials.json` is correct and token file is valid.

---
This README is downloadable and can be placed directly in the root of your project.

