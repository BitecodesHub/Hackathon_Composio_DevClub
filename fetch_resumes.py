# fetch_resumes.py
import os
import base64
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

KEYWORDS = ['Resume','resume', 'cv', 'job application']  # filenames containing these will be downloaded

def authenticate_gmail():
    """Authenticate with Gmail API and return service object"""
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
        creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    service = build('gmail', 'v1', credentials=creds)
    return service
    
def fetch_resume_emails(service, query="has:attachment"):
    """Fetch all emails with attachments"""
    results = service.users().messages().list(userId='me', q=query).execute()
    messages = results.get('messages', [])
    print(f"Found {len(messages)} emails with attachments.")
    return messages


def download_attachments(service, messages, save_folder="resumes"):
    """Download attachments whose filenames match resume keywords"""
    if not os.path.exists(save_folder):
        os.makedirs(save_folder)

    for msg in messages:
        msg_id = msg['id']
        message = service.users().messages().get(userId='me', id=msg_id).execute()
        parts = message['payload'].get('parts', [])
        for part in parts:
            filename = part.get('filename')
            if filename and any(keyword.lower() in filename.lower() for keyword in KEYWORDS):
                if 'attachmentId' in part['body']:
                    att_id = part['body']['attachmentId']
                    attachment = service.users().messages().attachments().get(
                        userId='me', messageId=msg_id, id=att_id
                    ).execute()
                    file_data = base64.urlsafe_b64decode(attachment['data'].encode('UTF-8'))
                    path = os.path.join(save_folder, filename)
                    with open(path, 'wb') as f:
                        f.write(file_data)
                    print(f"Downloaded: {filename}")
            else:
                if filename:  # optional: log skipped files
                    print(f"Skipped: {filename} (does not match keywords)")

if __name__ == "__main__":
    print("Authenticating Gmail...")
    service = authenticate_gmail()
    print("Fetching emails with attachments...")
    emails = fetch_resume_emails(service)
    print("Downloading attachments that look like resumes...")
    download_attachments(service, emails)
    print("All matching attachments downloaded to 'resumes/' folder.")
