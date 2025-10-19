## 🌟 Overview

**AI Recruiter Copilot** streamlines your hiring process by automating
every step --- from resume parsing to scheduling interviews.\
It integrates Gmail, Gemini API, Google Sheets, Notion, and Google
Calendar into one intelligent workflow.

### 🧩 Tech Stack

-   **Backend:** Python (Flask / FastAPI)
-   **Frontend:** React + Vite + Tailwind CSS
-   **APIs Used:** Gmail API, Google Calendar API, Google Sheets API,
    Gemini API, Notion API

------------------------------------------------------------------------

## ⚙️ Project Setup

### 🪄 1. Clone the Repository

``` bash
git clone <your-repo-url>
cd <your-repo-folder>
```

------------------------------------------------------------------------

## 🧠 Backend Setup

### 2. Create and Activate Virtual Environment

``` bash
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate   # Windows
```

### 3. Install Python Dependencies

``` bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure Gemini API Key

1.  Visit [Google AI Studio API
    Keys](https://aistudio.google.com/app/apikey)
2.  Click **Create API Key**
3.  Copy your key
4.  Export it:

``` bash
export GEMINI_API_KEY="YOUR_NEW_GEMINI_KEY"
```

> 💡 **Pro Tip:** Avoid hardcoding API keys in source files. Use
> environment variables.

### 5. Setup Gmail API

1.  Go to [Google Cloud Console](https://console.cloud.google.com/)
2.  Create/select a project
3.  Enable **Gmail API**
4.  Create OAuth credentials → download `credentials.json`
5.  Place it in the project root

### 6. Setup Google Sheets / Notion (Optional)

-   **Google Sheets:** Enable Sheets API + create OAuth credentials\
-   **Notion:** Create an integration, copy the token, and share target
    databases

------------------------------------------------------------------------

## 🚀 Running the Project

### ▶️ Start the Backend Server

``` bash
python app.py
```

> The backend will run on **http://localhost:5000**

### 💻 Start the Frontend Server

``` bash
cd frontend
npm install
npm run dev
```

> The frontend will run on **http://localhost:8000**

------------------------------------------------------------------------

## 🧩 Stepwise Implementation

  Step   Description                       File
  ------ --------------------------------- ----------------------------
  1️⃣     Gmail Integration                 `step1_gmail.py`
  2️⃣     Gemini Parsing                    `step2_gemini_parser.py`
  3️⃣     Pipeline Update (Sheets/Notion)   `step3_pipeline_update.py`
  4️⃣     Interview Scheduling              `step4_calendar.py`

------------------------------------------------------------------------

## 🧰 Notes

-   Ensure **`GEMINI_API_KEY`** is exported before running any script\
-   Wait a few minutes for Google Cloud APIs to activate after enabling\
-   Always use a virtual environment to avoid dependency conflicts

------------------------------------------------------------------------

## 🐞 Troubleshooting

  -----------------------------------------------------------------------------------------------------
  Issue                    Possible Cause                           Fix
  ------------------------ ---------------------------------------- -----------------------------------
  `403 SERVICE_DISABLED`   Gemini API not enabled                   Enable Generative Language API or
                                                                    create a new key

  Gmail OAuth Error        Invalid `credentials.json`               Recreate OAuth credentials and
                                                                    reauthorize

  `ModuleNotFoundError`    Missing packages                         Run
                                                                    `pip install -r requirements.txt`
  -----------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

## 🧡 Contributing

Pull requests are welcome!\
For major changes, please open an issue first to discuss what you'd like
to change.

``` bash
git checkout -b feature/your-feature-name
git commit -m "Add awesome feature"
git push origin feature/your-feature-name
```

------------------------------------------------------------------------

## 🧾 License

This project is licensed under the **MIT License**