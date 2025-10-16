import os
import json
import logging
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
TOKEN_FILE = "token.json"

def get_calendar_service():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
        creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
    service = build('calendar', 'v3', credentials=creds)
    return service

# --------------------------
# Schedule interviews
# --------------------------
def schedule_interview(service, candidate, start_time, calendar_id='primary', duration_minutes=30):
    name = candidate.get("full_name", "Unknown")
    email = candidate.get("email")
    
    if not email:
        logging.warning(f"Skipping {name}: no email found.")
        return None
    
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
    logging.info(f"✅ Scheduled interview for {name} ({email}) at {start_time.strftime('%Y-%m-%d %H:%M')} UTC")
    
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
    """
    Schedule interviews with proper spacing and business hours logic.
    
    Args:
        input_folder: Folder containing candidate JSON files
        start_date: Date to start scheduling (defaults to tomorrow)
        start_hour: Hour to start interviews each day (24-hour format)
        duration_minutes: Interview duration
        buffer_minutes: Buffer time between interviews
        work_hours: Tuple of (start_hour, end_hour) for business hours
        skip_weekends: Whether to skip Saturday and Sunday
    """
    service = get_calendar_service()
    
    # Initialize start time (timezone-aware)
    if start_date is None:
        current_time = datetime.now(timezone.utc)
        start_time = (current_time + timedelta(days=1)).replace(
            hour=start_hour, minute=0, second=0, microsecond=0
        )
    else:
        start_time = start_date.replace(
            hour=start_hour, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
        )
    
    # Skip weekends if needed
    if skip_weekends:
        while start_time.weekday() >= 5:  # 5=Saturday, 6=Sunday
            start_time += timedelta(days=1)
    
    scheduled_count = 0
    skipped_count = 0
    
    # Process all candidates
    for filename in sorted(os.listdir(input_folder)):
        if filename.endswith(".json"):
            with open(os.path.join(input_folder, filename), "r") as f:
                candidate = json.load(f)
            
            # Check if we need to move to next day
            interview_end_hour = start_time.hour + (start_time.minute + duration_minutes) / 60
            if interview_end_hour >= work_hours[1]:
                # Move to next day
                start_time = start_time.replace(hour=work_hours[0], minute=0) + timedelta(days=1)
                
                # Skip weekends
                if skip_weekends:
                    while start_time.weekday() >= 5:
                        start_time += timedelta(days=1)
                
                logging.info(f"Moving to next day: {start_time.strftime('%Y-%m-%d')}")
            
            # Schedule the interview
            end_time = schedule_interview(service, candidate, start_time, duration_minutes=duration_minutes)
            
            if end_time:
                scheduled_count += 1
                # Next interview starts after current one + buffer
                start_time = end_time + timedelta(minutes=buffer_minutes)
            else:
                skipped_count += 1
    
    logging.info(f"✅ Scheduling complete! {scheduled_count} interviews scheduled, {skipped_count} skipped.")

# --------------------------
# Entry point
# --------------------------
if __name__ == "__main__":
    logging.info("Starting to schedule interviews...")
    
    # Example: Schedule with custom settings
    process_all_candidates(
        duration_minutes=45,      # 45-minute interviews
        buffer_minutes=15,        # 15-minute buffer between interviews
        work_hours=(9, 17),       # 9 AM to 5 PM
        skip_weekends=True        # Skip Saturday/Sunday
    )
    
    logging.info("✅ All interviews scheduled!")