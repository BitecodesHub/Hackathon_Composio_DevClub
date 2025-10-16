# AI Recruiter Copilot

This project automates the recruitment workflow by parsing resumes from Gmail, enriching candidate data using the Gemini API, scheduling interviews in Google Calendar, and updating a candidate pipeline in Google Sheets or Notion.

## Project Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-folder>
   ```

2. **Create and activate a virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On macOS/Linux
   # OR
   venv\Scripts\activate  # On Windows
   ```

3. **Install required packages**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Setting up Gemini API Key**
   - Go to [Google AI Studio API Keys](https://aistudio.google.com/app/apikey)
   - Click **Create API Key**
   - Copy the key
   - Export it in terminal:
     ```bash
     export GEMINI_API_KEY="YOUR_NEW_GEMINI_KEY"
     ```
   - Alternatively, you can hardcode it in `gemini_parser.py` (not recommended).

5. **Configure Gmail API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing project
   - Enable Gmail API
   - Create OAuth credentials and download `credentials.json`
   - Place `credentials.json` in the project root

6. **Configure Google Sheets / Notion (optional)**
   - **Google Sheets**:
     - Enable Google Sheets API
     - Create OAuth credentials
   - **Notion**:
     - Create an integration token
     - Share target databases with the integration

## Project File Structure & Description

| File / Script                  | Purpose                                                                 |
|--------------------------------|-------------------------------------------------------------------------|
| `parse_resumes.py`            | Extract text from PDF/DOCX resumes and save .txt files.                 |
| `gemini_parser.py`            | Send parsed resume text to Gemini API and get structured JSON with candidate details. |
| `fetch_resumes.py`            | (Optional) Connect to Gmail, download new resumes into `resumes/` folder. |
| `schedule_interviews.py`      | Schedule interviews automatically in Google Calendar using candidate info. |
| `update_pipeline_sheets.py`   | Update candidate information into Google Sheets.                        |
| `update_pipeline_notion.py`   | Update candidate information into Notion database.                      |
| `requirements.txt`            | Contains all Python dependencies for the project.                       |
| `.env`                        | Optional: Store environment variables like `GEMINI_API_KEY`.            |
| `resumes/`                    | Folder where raw resumes (PDF/DOCX) are stored.                         |
| `parsed_text/`                | Folder to store extracted text from resumes.                           |
| `parsed_json/`                | Folder to store structured JSON output from Gemini.                    |
| `token.json`                  | OAuth token for Google API access (auto-generated on first run).        |

## Running the Project

1. **Fetch resumes from Gmail (if implemented)**
   ```bash
   python fetch_resumes.py
   ```

2. **Parse resumes into text**
   ```bash
   python parse_resumes.py
   ```

3. **Send resumes to Gemini API**
   ```bash
   python gemini_parser.py
   ```

4. **Schedule interviews**
   ```bash
   python schedule_interviews.py
   ```

5. **Update candidate pipeline**
   - Google Sheets:
     ```bash
     python update_pipeline_sheets.py
     ```
   - Notion:
     ```bash
     python update_pipeline_notion.py
     ```

## Notes & Best Practices

- Ensure `GEMINI_API_KEY` is set before running Gemini scripts.
- After enabling APIs in Google Cloud, wait a few minutes for propagation.
- Use a virtual environment to avoid dependency conflicts.
- Delete `token.json` if you change Google project or OAuth scopes.

## Troubleshooting

| Error                              | Solution                                                                 |
|------------------------------------|-------------------------------------------------------------------------|
| `403 SERVICE_DISABLED`            | Gemini API key’s project does not have Generative Language API enabled. Create a new key in AI Studio or enable API. |
| Gmail OAuth errors                | Ensure `credentials.json` is correct, delete old `token.json` to force re-authentication. |
| Google Calendar `insufficientPermissions` | Delete `token.json` and ensure `SCOPES = ['https://www.googleapis.com/auth/calendar.events']`. |