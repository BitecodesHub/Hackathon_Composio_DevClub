# gemini_parser.py
import os
import json
import re
import time
import logging
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError

# --------------------------
# Setup logging
# --------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO
)

# --------------------------
# Load Gemini API key
# --------------------------
GEMINI_API_KEY = 'AIzaSyDj63l6Em6gSpAmPUTZUSKaZJ988UmrN84'
if not GEMINI_API_KEY:
    raise ValueError("❌ GEMINI_API_KEY not set. Please export your Gemini API key.")

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-pro")

# --------------------------
# Helper functions
# --------------------------
def safe_parse_json(raw_output):
    """
    Safely extract and parse JSON from Gemini output.
    Handles extra characters, logs errors if parsing fails.
    """
    try:
        # Extract first {...} block
        match = re.search(r'\{.*\}', raw_output, re.DOTALL)
        if match:
            return json.loads(match.group())
        logging.warning("No JSON object found in response.")
        return None
    except json.JSONDecodeError as e:
        logging.warning(f"JSON decode error: {e}")
        return None

def parse_resume_text(text, retries=3, backoff=10):
    """
    Send resume text to Gemini and get structured JSON response.
    Automatically retries on quota errors or transient API failures.
    """
    prompt = f"""
    Extract candidate details from the resume text below.
    Return a valid JSON with the following fields:
    - full_name
    - email
    - phone
    - skills (as a list)
    - education
    - experience_summary
    - current_company
    - current_role

    Resume:
    {text}
    """

    for attempt in range(1, retries + 1):
        try:
            response = model.generate_content(prompt)
            data = safe_parse_json(response.text)
            if data:
                return data
            else:
                logging.warning("Failed to parse JSON, retrying...")
        except ResourceExhausted as e:
            wait_time = getattr(e, "retry_delay", None)
            if wait_time:
                logging.warning(f"Quota exceeded, retrying in {wait_time.seconds} seconds...")
                time.sleep(wait_time.seconds + 1)
            else:
                logging.warning(f"Quota exceeded, waiting {backoff}s before retry...")
                time.sleep(backoff)
        except GoogleAPIError as e:
            logging.error(f"API error: {e}. Retrying in {backoff}s...")
            time.sleep(backoff)
        except Exception as e:
            logging.error(f"Unexpected error: {e}. Retrying in {backoff}s...")
            time.sleep(backoff)
    logging.error("Failed to parse resume after multiple attempts.")
    return None

def process_all_resumes(input_folder="parsed_text", output_folder="parsed_json"):
    """
    Process all resume text files with Gemini and save structured JSON.
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for filename in os.listdir(input_folder):
        if filename.endswith(".txt"):
            file_path = os.path.join(input_folder, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
            logging.info(f"🧠 Parsing {filename} ...")
            parsed = parse_resume_text(text)
            if parsed:
                json_filename = os.path.splitext(filename)[0] + ".json"
                with open(os.path.join(output_folder, json_filename), "w", encoding="utf-8") as out:
                    json.dump(parsed, out, indent=2)
                logging.info(f"✅ Saved structured data: {json_filename}")
            else:
                logging.error(f"❌ Failed to parse {filename}")

# --------------------------
# Entry point
# --------------------------
if __name__ == "__main__":
    process_all_resumes()
    logging.info("✅ All resumes processed! Structured JSON saved in 'parsed_json/' folder.")
