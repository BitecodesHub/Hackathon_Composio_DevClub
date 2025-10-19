# schedule_interviews.py
import os
import json
import logging
import hashlib
from datetime import datetime, timedelta, timezone
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# --------------------------
# Setup logging
# --------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO
)

# --------------------------
# Google Calendar setup
# --------------------------
SCOPES = ['https://www.googleapis.com/auth/calendar.events']
CREDENTIALS_FILE = "credentials.json"
TOKEN_FILE = "token2.json"
SCHEDULE_LOG_FOLDER = "scheduled_interviews"
SCHEDULED_CANDIDATES_FILE = 'scheduled_candidates.json'


# --------------------------
# Utility functions
# --------------------------
def load_scheduled_candidates():
    """Load hashes of already scheduled candidates"""
    if os.path.exists(SCHEDULED_CANDIDATES_FILE):
        try:
            with open(SCHEDULED_CANDIDATES_FILE, 'r', encoding='utf-8') as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()


def save_scheduled_candidate(candidate_data):
    """Save hash of scheduled candidate"""
    scheduled = load_scheduled_candidates()
    candidate_id = create_candidate_id(candidate_data)
    scheduled.add(candidate_id)

    with open(SCHEDULED_CANDIDATES_FILE, 'w', encoding='utf-8') as f:
        json.dump(list(scheduled), f)


def create_candidate_id(candidate_data):
    """Create unique ID based on candidate's core information"""
    key_fields = [
        candidate_data.get('full_name', ''),
        candidate_data.get('email', ''),
        candidate_data.get('phone', ''),
        ' '.join(candidate_data.get('skills', [])),
        candidate_data.get('education', '')
    ]
    key_string = '|'.join(str(field) for field in key_fields).lower().strip()
    return hashlib.md5(key_string.encode('utf-8')).hexdigest()


def ensure_folder(folder):
    os.makedirs(folder, exist_ok=True)


def get_calendar_service():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
        creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w', encoding='utf-8') as token:
            token.write(creds.to_json())
    service = build('calendar', 'v3', credentials=creds)
    return service


# --------------------------
# Core scheduling logic
# --------------------------
def schedule_interview(service, candidate, start_time, calendar_id='primary', duration_minutes=30):
    name = candidate.get("full_name", "Unknown")
    email = candidate.get("email")

    if not email:
        logging.warning(f"Skipping {name}: no email found.")
        return None

    ensure_folder(SCHEDULE_LOG_FOLDER)
    end_time = start_time + timedelta(minutes=duration_minutes)

    event = {
        'summary': f'Interview: {name}',
        'description': f'Interview with {name}\nEmail: {email}\nLinkedIn: {candidate.get("linkedin_url", "N/A")}',
        'start': {'dateTime': start_time.isoformat(), 'timeZone': 'UTC'},
        'end': {'dateTime': end_time.isoformat(), 'timeZone': 'UTC'},
        'attendees': [{'email': email}],
        'reminders': {'useDefault': True},
    }

    created_event = service.events().insert(calendarId=calendar_id, body=event).execute()

    # Log scheduled interview info
    event_id = created_event.get("id")
    calendar_link = created_event.get("htmlLink")

    schedule_record = {
        "candidate_name": name,
        "email": email,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "event_id": event_id,
        "calendar_link": calendar_link,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    safe_name = name.replace(" ", "_").lower()
    filename = f"{safe_name}_{start_time.strftime('%Y%m%dT%H%M')}.json"
    filepath = os.path.join(SCHEDULE_LOG_FOLDER, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(schedule_record, f, indent=2)

    save_scheduled_candidate(candidate)

    logging.info(f"✅ Scheduled interview for {name} ({email}) at {start_time.strftime('%Y-%m-%d %H:%M')} UTC")
    logging.info(f"🗓️  Saved to {filepath}")
    return end_time


def process_all_candidates(
    input_folder="enriched_json",
    start_date=None,
    start_hour=9,
    duration_minutes=30,
    buffer_minutes=15,
    work_hours=(9, 17),
    skip_weekends=True
):
    """Schedule interviews with candidate-level deduplication"""
    service = get_calendar_service()
    ensure_folder(SCHEDULE_LOG_FOLDER)

    scheduled_candidates = load_scheduled_candidates()

    # Determine starting time
    if start_date is None:
        current_time = datetime.now(timezone.utc)
        start_time = (current_time + timedelta(days=1)).replace(
            hour=start_hour, minute=0, second=0, microsecond=0
        )
    else:
        start_time = start_date.replace(
            hour=start_hour, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
        )

    # Skip weekends if necessary
    if skip_weekends:
        while start_time.weekday() >= 5:
            start_time += timedelta(days=1)

    scheduled_count = 0
    skipped_count = 0
    duplicate_count = 0

    # Process all candidate JSON files
    for filename in sorted(os.listdir(input_folder)):
        if filename.endswith(".json"):
            file_path = os.path.join(input_folder, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                candidate = json.load(f)

            candidate_name = candidate.get("full_name", "Unknown")
            candidate_id = create_candidate_id(candidate)

            # Skip already scheduled
            if candidate_id in scheduled_candidates:
                logging.info(f"🔄 Skipping already scheduled candidate: {candidate_name}")
                duplicate_count += 1
                continue

            # Move to next day if work hours exceeded
            interview_end_hour = start_time.hour + (start_time.minute + duration_minutes) / 60
            if interview_end_hour >= work_hours[1]:
                start_time = start_time.replace(hour=work_hours[0], minute=0) + timedelta(days=1)
                if skip_weekends:
                    while start_time.weekday() >= 5:
                        start_time += timedelta(days=1)
                logging.info(f"Moving to next day: {start_time.strftime('%Y-%m-%d')}")

            end_time = schedule_interview(service, candidate, start_time, duration_minutes=duration_minutes)
            if end_time:
                scheduled_count += 1
                start_time = end_time + timedelta(minutes=buffer_minutes)
            else:
                skipped_count += 1

    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "scheduled_count": scheduled_count,
        "skipped_count": skipped_count,
        "duplicate_count": duplicate_count
    }

    summary_file = os.path.join(SCHEDULE_LOG_FOLDER, f"summary_{datetime.now().strftime('%Y%m%dT%H%M')}.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    logging.info("✅ Scheduling complete!")
    logging.info(f"📊 Scheduled: {scheduled_count}, Skipped: {skipped_count}, Duplicates: {duplicate_count}")
    logging.info(f"🗂️  Summary saved to {summary_file}")


# --------------------------
# Entry point
# --------------------------
if __name__ == "__main__":
    logging.info("Starting to schedule interviews...")

    process_all_candidates(
        duration_minutes=45,      # 45-minute interviews
        buffer_minutes=15,        # 15-minute buffer between interviews
        work_hours=(9, 17),       # 9 AM to 5 PM
        skip_weekends=True        # Skip Saturday/Sunday
    )

    logging.info("✅ Interview scheduling completed!")
