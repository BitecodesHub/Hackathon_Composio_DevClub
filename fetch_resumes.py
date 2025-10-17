# fetch_resumes.py
import os
import base64
import logging
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Setup logging
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO
)

# --------------------------
# Configuration
# --------------------------
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
KEYWORDS = ['Resume', 'resume', 'cv', 'CV', 'job application', 'application']
CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'

def authenticate_gmail():
    """
    Authenticate with Gmail API and return service object
    
    Returns:
        googleapiclient.discovery.Resource: Gmail API service
    """
    creds = None
    
    # Load existing credentials
    if os.path.exists(TOKEN_FILE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
            logging.info("✓ Loaded existing credentials")
        except Exception as e:
            logging.warning(f"Could not load existing credentials: {e}")
    
    # Refresh or create new credentials
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                logging.info("🔄 Refreshing expired credentials...")
                creds.refresh()
            except Exception as e:
                logging.warning(f"Could not refresh credentials: {e}")
                creds = None
        
        if not creds:
            if not os.path.exists(CREDENTIALS_FILE):
                raise FileNotFoundError(
                    f"❌ {CREDENTIALS_FILE} not found. "
                    "Please download it from Google Cloud Console."
                )
            
            logging.info("🔐 Starting OAuth flow...")
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
            logging.info("✓ Authentication successful")
        
        # Save credentials
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
            logging.info(f"✓ Saved credentials to {TOKEN_FILE}")
    
    service = build('gmail', 'v1', credentials=creds)
    logging.info("✓ Gmail service initialized")
    return service

def fetch_resume_emails(service, query="has:attachment"):
    """
    Fetch all emails matching the query
    
    Args:
        service: Gmail API service
        query: Gmail search query
        
    Returns:
        list: List of message objects
    """
    try:
        logging.info(f"🔍 Searching emails with query: '{query}'")
        results = service.users().messages().list(userId='me', q=query, maxResults=100).execute()
        messages = results.get('messages', [])
        
        logging.info(f"✓ Found {len(messages)} emails with attachments")
        return messages
        
    except HttpError as error:
        logging.error(f"❌ Gmail API error: {error}")
        return []
    except Exception as e:
        logging.error(f"❌ Error fetching emails: {e}")
        return []

def download_attachments(service, messages, save_folder="resumes"):
    """
    Download attachments whose filenames match resume keywords
    
    Args:
        service: Gmail API service
        messages: List of message objects
        save_folder: Folder to save attachments
        
    Returns:
        dict: Summary of download results
    """
    if not os.path.exists(save_folder):
        os.makedirs(save_folder)
        logging.info(f"📁 Created folder: {save_folder}")
    
    results = {'downloaded': 0, 'skipped': 0, 'errors': 0}
    
    for i, msg in enumerate(messages, 1):
        msg_id = msg['id']
        
        try:
            logging.info(f"\n[{i}/{len(messages)}] Processing message {msg_id[:8]}...")
            message = service.users().messages().get(userId='me', id=msg_id).execute()
            
            # Get email metadata
            headers = message['payload'].get('headers', [])
            subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'No Subject')
            from_email = next((h['value'] for h in headers if h['name'].lower() == 'from'), 'Unknown')
            
            logging.info(f"   From: {from_email}")
            logging.info(f"   Subject: {subject}")
            
            # Process parts
            parts = message['payload'].get('parts', [])
            
            if not parts:
                # Check if the payload itself is an attachment
                if 'body' in message['payload'] and 'attachmentId' in message['payload']['body']:
                    parts = [message['payload']]
            
            attachment_found = False
            
            for part in parts:
                filename = part.get('filename', '')
                
                if filename and any(keyword.lower() in filename.lower() for keyword in KEYWORDS):
                    attachment_found = True
                    
                    if 'attachmentId' in part.get('body', {}):
                        att_id = part['body']['attachmentId']
                        
                        try:
                            logging.info(f"   📎 Downloading: {filename}")
                            attachment = service.users().messages().attachments().get(
                                userId='me', 
                                messageId=msg_id, 
                                id=att_id
                            ).execute()
                            
                            file_data = base64.urlsafe_b64decode(attachment['data'].encode('UTF-8'))
                            
                            # Save file with unique name if exists
                            base_name, ext = os.path.splitext(filename)
                            save_path = os.path.join(save_folder, filename)
                            counter = 1
                            
                            while os.path.exists(save_path):
                                filename = f"{base_name}_{counter}{ext}"
                                save_path = os.path.join(save_folder, filename)
                                counter += 1
                            
                            with open(save_path, 'wb') as f:
                                f.write(file_data)
                            
                            file_size = len(file_data) / 1024  # KB
                            logging.info(f"   ✅ Downloaded: {filename} ({file_size:.1f} KB)")
                            results['downloaded'] += 1
                            
                        except Exception as e:
                            logging.error(f"   ❌ Error downloading attachment: {e}")
                            results['errors'] += 1
                    else:
                        logging.warning(f"   ⚠️ Attachment ID not found for: {filename}")
                        results['skipped'] += 1
                elif filename:
                    logging.info(f"   ⏭️ Skipped: {filename} (doesn't match keywords)")
                    results['skipped'] += 1
            
            if not attachment_found:
                logging.info(f"   ℹ️ No matching attachments found")
                
        except HttpError as error:
            logging.error(f"   ❌ Gmail API error: {error}")
            results['errors'] += 1
        except Exception as e:
            logging.error(f"   ❌ Error processing message: {e}")
            results['errors'] += 1
    
    # Print summary
    logging.info(f"\n{'='*60}")
    logging.info("📊 DOWNLOAD SUMMARY")
    logging.info(f"{'='*60}")
    logging.info(f"✅ Downloaded: {results['downloaded']}")
    logging.info(f"⏭️ Skipped: {results['skipped']}")
    logging.info(f"❌ Errors: {results['errors']}")
    logging.info(f"{'='*60}\n")
    
    return results

# --------------------------
# Entry point
# --------------------------
if __name__ == "__main__":
    try:
        logging.info("🚀 Starting Gmail resume fetcher...")
        logging.info("="*60)
        
        # Authenticate
        service = authenticate_gmail()
        
        # Fetch emails
        emails = fetch_resume_emails(service)
        
        if not emails:
            logging.warning("⚠️ No emails found with attachments")
        else:
            # Download attachments
            results = download_attachments(service, emails)
            
            if results['downloaded'] > 0:
                logging.info(f"✅ Successfully downloaded {results['downloaded']} resume(s) to 'resumes/' folder")
            else:
                logging.warning("⚠️ No resume attachments were downloaded")
        
    except FileNotFoundError as e:
        logging.error(str(e))
    except Exception as e:
        logging.error(f"❌ Unexpected error: {e}")
        raise