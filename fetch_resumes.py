# fetch_resumes.py
import os
import base64
import logging
import hashlib
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
PROCESSED_EMAILS_FILE = 'processed_emails.json'

def load_processed_emails():
    """Load set of already processed email message IDs"""
    if os.path.exists(PROCESSED_EMAILS_FILE):
        try:
            with open(PROCESSED_EMAILS_FILE, 'r') as f:
                return set(json.load(f))
        except:
            return set()
    return set()

def save_processed_email(msg_id):
    """Save processed email ID to prevent re-processing"""
    processed = load_processed_emails()
    processed.add(msg_id)
    with open(PROCESSED_EMAILS_FILE, 'w') as f:
        json.dump(list(processed), f)

def calculate_file_hash(file_path):
    """Calculate MD5 hash of file content for duplicate detection"""
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

def load_existing_hashes(resume_folder="resumes"):
    """Load hashes of all existing resume files"""
    hashes = set()
    if os.path.exists(resume_folder):
        for filename in os.listdir(resume_folder):
            file_path = os.path.join(resume_folder, filename)
            if os.path.isfile(file_path):
                try:
                    file_hash = calculate_file_hash(file_path)
                    hashes.add(file_hash)
                except Exception as e:
                    logging.warning(f"Could not calculate hash for {filename}: {e}")
    return hashes

def authenticate_gmail():
    """
    Authenticate with Gmail API and return service object
    """
    creds = None
    
    if os.path.exists(TOKEN_FILE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
            logging.info("✓ Loaded existing credentials")
        except Exception as e:
            logging.warning(f"Could not load existing credentials: {e}")
    
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
        
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
            logging.info(f"✓ Saved credentials to {TOKEN_FILE}")
    
    service = build('gmail', 'v1', credentials=creds)
    logging.info("✓ Gmail service initialized")
    return service

def fetch_resume_emails(service, query="has:attachment"):
    """
    Fetch all emails matching the query
    """
    try:
        logging.info(f"🔍 Searching emails with query: '{query}'")
        results = service.users().messages().list(userId='me', q=query, maxResults=100).execute()
        messages = results.get('messages', [])
        
        # Filter out already processed emails
        processed_emails = load_processed_emails()
        new_messages = [msg for msg in messages if msg['id'] not in processed_emails]
        
        logging.info(f"✓ Found {len(messages)} emails with attachments")
        logging.info(f"✓ {len(new_messages)} new emails to process")
        
        return new_messages
        
    except HttpError as error:
        logging.error(f"❌ Gmail API error: {error}")
        return []
    except Exception as e:
        logging.error(f"❌ Error fetching emails: {e}")
        return []

def download_attachments(service, messages, save_folder="resumes"):
    """
    Download attachments with duplicate detection
    """
    if not os.path.exists(save_folder):
        os.makedirs(save_folder)
        logging.info(f"📁 Created folder: {save_folder}")
    
    # Load existing file hashes for duplicate detection
    existing_hashes = load_existing_hashes(save_folder)
    results = {'downloaded': 0, 'skipped': 0, 'duplicates': 0, 'errors': 0}
    
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
                            
                            # Calculate hash of downloaded content
                            file_hash = hashlib.md5(file_data).hexdigest()
                            
                            # Check for duplicate
                            if file_hash in existing_hashes:
                                logging.info(f"   ⏭️ Skipped duplicate: {filename}")
                                results['duplicates'] += 1
                                continue
                            
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
                            
                            # Add to existing hashes
                            existing_hashes.add(file_hash)
                            file_size = len(file_data) / 1024  # KB
                            logging.info(f"   ✅ Downloaded: {filename} ({file_size:.1f} KB)")
                            results['downloaded'] += 1
                            
                            # Mark email as processed
                            save_processed_email(msg_id)
                            
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
                # Mark as processed even if no attachments to avoid re-checking
                save_processed_email(msg_id)
                
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
    logging.info(f"🔄 Duplicates: {results['duplicates']}")
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
            logging.warning("⚠️ No new emails found with attachments")
        else:
            # Download attachments
            results = download_attachments(service, emails)
            
            if results['downloaded'] > 0:
                logging.info(f"✅ Successfully downloaded {results['downloaded']} new resume(s)")
            else:
                logging.info("ℹ️ No new resumes downloaded (all were duplicates or skipped)")
        
    except FileNotFoundError as e:
        logging.error(str(e))
    except Exception as e:
        logging.error(f"❌ Unexpected error: {e}")
        raise