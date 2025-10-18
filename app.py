from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import logging
from datetime import datetime, timedelta, timezone
from werkzeug.utils import secure_filename
import base64

# Import our modules
from fetch_resumes import authenticate_gmail, fetch_resume_emails, download_attachments
from parse_resumes import extract_text_from_file
from gemini_parser import parse_resume_text
from linkedin_enricher import enrich_candidate
from schedule_interviews import get_calendar_service, schedule_interview

# --------------------------
# Flask App Setup
# --------------------------
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Configure upload settings
UPLOAD_FOLDER = 'resumes'
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Setup logging
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO
)

# --------------------------
# Helper Functions
# --------------------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_all_candidates():
    """Get all candidates from enriched_json folder"""
    candidates = []
    enriched_folder = "enriched_json"
    parsed_folder = "parsed_json"
    
    # First try enriched folder, fallback to parsed
    folder = enriched_folder if os.path.exists(enriched_folder) else parsed_folder
    
    if not os.path.exists(folder):
        return candidates
    
    for filename in os.listdir(folder):
        if filename.endswith('.json'):
            try:
                with open(os.path.join(folder, filename), 'r') as f:
                    candidate = json.load(f)
                    candidate['id'] = filename.replace('.json', '')
                    candidate['filename'] = filename
                    
                    # Try to find matching resume file
                    base_name = filename.replace('.json', '')
                    for ext in ['pdf', 'docx', 'doc']:
                        resume_path = os.path.join(UPLOAD_FOLDER, f"{base_name}.{ext}")
                        if os.path.exists(resume_path):
                            candidate['resume_filename'] = f"{base_name}.{ext}"
                            break
                    
                    candidates.append(candidate)
            except Exception as e:
                logging.error(f"Error loading candidate {filename}: {e}")
    
    return candidates

def find_resume_file(candidate_id):
    """Find the resume file for a given candidate ID"""
    for ext in ['pdf', 'docx', 'doc']:
        filepath = os.path.join(UPLOAD_FOLDER, f"{candidate_id}.{ext}")
        if os.path.exists(filepath):
            return f"{candidate_id}.{ext}"
    return None

# --------------------------
# API Routes
# --------------------------

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

# --------------------------
# Gmail Integration Routes
# --------------------------

@app.route('/api/gmail/fetch', methods=['POST'])
def fetch_from_gmail():
    """Fetch resumes from Gmail"""
    try:
        data = request.json
        query = data.get('query', 'has:attachment')
        
        logging.info("Authenticating with Gmail...")
        service = authenticate_gmail()
        
        logging.info(f"Fetching emails with query: {query}")
        emails = fetch_resume_emails(service, query)
        
        logging.info("Downloading attachments...")
        download_attachments(service, emails)
        
        return jsonify({
            'success': True,
            'message': f'Successfully fetched {len(emails)} emails',
            'count': len(emails)
        })
    except Exception as e:
        logging.error(f"Error fetching from Gmail: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# --------------------------
# Resume Upload Routes
# --------------------------

@app.route('/api/resumes/upload', methods=['POST'])
def upload_resume():
    """Upload a resume file"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Create folder if it doesn't exist
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            
            file.save(filepath)
            
            return jsonify({
                'success': True,
                'message': 'File uploaded successfully',
                'filename': filename
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Only PDF and DOCX allowed'
            }), 400
            
    except Exception as e:
        logging.error(f"Error uploading file: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/resumes/list', methods=['GET'])
def list_resumes():
    """List all uploaded resumes"""
    try:
        resumes = []
        
        if os.path.exists(UPLOAD_FOLDER):
            for filename in os.listdir(UPLOAD_FOLDER):
                if allowed_file(filename):
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file_stats = os.stat(filepath)
                    
                    resumes.append({
                        'filename': filename,
                        'size': file_stats.st_size,
                        'uploaded_at': datetime.fromtimestamp(file_stats.st_mtime).isoformat()
                    })
        
        return jsonify({
            'success': True,
            'resumes': resumes,
            'count': len(resumes)
        })
    except Exception as e:
        logging.error(f"Error listing resumes: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/resumes/download/<filename>', methods=['GET'])
def download_resume(filename):
    """Download a resume file"""
    try:
        safe_filename = secure_filename(filename)
        filepath = os.path.join(UPLOAD_FOLDER, safe_filename)
        
        logging.info(f"Attempting to download file: {filepath}")
        
        if not os.path.exists(filepath):
            logging.error(f"File not found: {filepath}")
            return jsonify({'success': False, 'error': f'File not found: {safe_filename}'}), 404
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=safe_filename,
            mimetype='application/octet-stream'
        )
    except Exception as e:
        logging.error(f"Error downloading file {filename}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/resumes/view/<filename>', methods=['GET'])
def view_resume(filename):
    """View resume content (text extraction)"""
    try:
        safe_filename = secure_filename(filename)
        filepath = os.path.join(UPLOAD_FOLDER, safe_filename)
        
        logging.info(f"Attempting to view file: {filepath}")
        
        if not os.path.exists(filepath):
            logging.error(f"File not found: {filepath}")
            return jsonify({'success': False, 'error': f'File not found: {safe_filename}'}), 404
        
        # Extract text from the resume
        text = extract_text_from_file(filepath)
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'Could not extract text from file'
            }), 500
        
        return jsonify({
            'success': True,
            'filename': safe_filename,
            'content': text,
            'file_size': os.path.getsize(filepath),
            'file_type': safe_filename.split('.')[-1].upper()
        })
    except Exception as e:
        logging.error(f"Error viewing file {filename}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/resumes/stream/<filename>', methods=['GET'])
def stream_resume(filename):
    """Stream resume file for viewing in browser"""
    try:
        safe_filename = secure_filename(filename)
        filepath = os.path.join(UPLOAD_FOLDER, safe_filename)
        
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        # Determine mimetype
        ext = safe_filename.split('.')[-1].lower()
        mimetype = 'application/pdf' if ext == 'pdf' else 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        
        return send_file(
            filepath,
            mimetype=mimetype,
            as_attachment=False,
            download_name=safe_filename
        )
    except Exception as e:
        logging.error(f"Error streaming file {filename}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --------------------------
# Parsing Routes
# --------------------------

@app.route('/api/parse/single', methods=['POST'])
def parse_single_resume():
    """Parse a single resume"""
    try:
        data = request.json
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'success': False, 'error': 'Filename required'}), 400
        
        filepath = os.path.join(UPLOAD_FOLDER, secure_filename(filename))
        
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        # Extract text
        logging.info(f"Extracting text from {filename}...")
        text = extract_text_from_file(filepath)
        
        # Parse with Gemini
        logging.info(f"Parsing with Gemini AI...")
        parsed_data = parse_resume_text(text)
        
        if not parsed_data:
            return jsonify({
                'success': False,
                'error': 'Failed to parse resume'
            }), 500
        
        # Add resume filename to parsed data
        parsed_data['resume_filename'] = filename
        parsed_data['resume_text'] = text
        
        # Save parsed JSON
        os.makedirs('parsed_json', exist_ok=True)
        json_filename = os.path.splitext(filename)[0] + '.json'
        with open(os.path.join('parsed_json', json_filename), 'w') as f:
            json.dump(parsed_data, f, indent=2)
        
        return jsonify({
            'success': True,
            'message': 'Resume parsed successfully',
            'data': parsed_data
        })
        
    except Exception as e:
        logging.error(f"Error parsing resume: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/parse/all', methods=['POST'])
def parse_all_resumes():
    """Parse all resumes in the folder"""
    try:
        results = []
        
        if not os.path.exists(UPLOAD_FOLDER):
            return jsonify({'success': False, 'error': 'No resumes folder found'}), 404
        
        for filename in os.listdir(UPLOAD_FOLDER):
            if allowed_file(filename):
                try:
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    
                    # Extract and parse
                    text = extract_text_from_file(filepath)
                    parsed_data = parse_resume_text(text)
                    
                    if parsed_data:
                        # Add resume info
                        parsed_data['resume_filename'] = filename
                        parsed_data['resume_text'] = text
                        
                        # Save parsed JSON
                        os.makedirs('parsed_json', exist_ok=True)
                        json_filename = os.path.splitext(filename)[0] + '.json'
                        with open(os.path.join('parsed_json', json_filename), 'w') as f:
                            json.dump(parsed_data, f, indent=2)
                        
                        results.append({
                            'filename': filename,
                            'status': 'success',
                            'data': parsed_data
                        })
                    else:
                        results.append({
                            'filename': filename,
                            'status': 'failed',
                            'error': 'Parsing failed'
                        })
                        
                except Exception as e:
                    results.append({
                        'filename': filename,
                        'status': 'error',
                        'error': str(e)
                    })
        
        success_count = sum(1 for r in results if r['status'] == 'success')
        
        return jsonify({
            'success': True,
            'message': f'Parsed {success_count}/{len(results)} resumes',
            'results': results
        })
        
    except Exception as e:
        logging.error(f"Error parsing all resumes: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --------------------------
# Candidate Routes
# --------------------------

@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    """Get all candidates"""
    try:
        candidates = get_all_candidates()
        
        # Apply filters if provided
        search = request.args.get('search', '').lower()
        skill = request.args.get('skill', '').lower()
        
        if search:
            candidates = [c for c in candidates if 
                         search in c.get('full_name', '').lower() or
                         search in c.get('email', '').lower()]
        
        if skill:
            candidates = [c for c in candidates if 
                         skill in ' '.join(c.get('skills', [])).lower()]
        
        return jsonify({
            'success': True,
            'candidates': candidates,
            'count': len(candidates)
        })
    except Exception as e:
        logging.error(f"Error getting candidates: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/candidates/<candidate_id>', methods=['GET'])
def get_candidate(candidate_id):
    """Get a specific candidate"""
    try:
        # Try enriched folder first
        filepath = os.path.join('enriched_json', f"{candidate_id}.json")
        
        # Fallback to parsed folder
        if not os.path.exists(filepath):
            filepath = os.path.join('parsed_json', f"{candidate_id}.json")
        
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'Candidate not found'}), 404
        
        with open(filepath, 'r') as f:
            candidate = json.load(f)
            candidate['id'] = candidate_id
            
            # Find resume file
            resume_file = find_resume_file(candidate_id)
            if resume_file:
                candidate['resume_filename'] = resume_file
        
        return jsonify({
            'success': True,
            'candidate': candidate
        })
    except Exception as e:
        logging.error(f"Error getting candidate: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/candidates/enrich', methods=['POST'])
def enrich_candidates():
    """Enrich all candidates with LinkedIn data"""
    try:
        os.makedirs('enriched_json', exist_ok=True)
        
        results = []
        
        if not os.path.exists('parsed_json'):
            return jsonify({'success': False, 'error': 'No parsed data found'}), 404
        
        for filename in os.listdir('parsed_json'):
            if filename.endswith('.json'):
                try:
                    with open(os.path.join('parsed_json', filename), 'r') as f:
                        candidate = json.load(f)
                    
                    enriched = enrich_candidate(candidate)
                    
                    # Preserve resume info
                    if 'resume_filename' in candidate:
                        enriched['resume_filename'] = candidate['resume_filename']
                    if 'resume_text' in candidate:
                        enriched['resume_text'] = candidate['resume_text']
                    
                    with open(os.path.join('enriched_json', filename), 'w') as f:
                        json.dump(enriched, f, indent=2)
                    
                    results.append({
                        'filename': filename,
                        'status': 'success'
                    })
                except Exception as e:
                    results.append({
                        'filename': filename,
                        'status': 'error',
                        'error': str(e)
                    })
        
        success_count = sum(1 for r in results if r['status'] == 'success')
        
        return jsonify({
            'success': True,
            'message': f'Enriched {success_count}/{len(results)} candidates',
            'results': results
        })
        
    except Exception as e:
        logging.error(f"Error enriching candidates: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --------------------------
# Interview Scheduling Routes
# --------------------------

@app.route('/api/interviews/scheduled', methods=['GET'])
def get_scheduled_interviews():
    """Fetch all scheduled interviews"""
    try:
        folder = 'scheduled_interviews'
        interviews = []
        
        if not os.path.exists(folder):
            logging.warning(f"Folder {folder} does not exist")
            return jsonify({
                'success': True,
                'interviews': [],
                'count': 0,
                'message': 'No scheduled interviews found.'
            })
        
        all_files = os.listdir(folder)
        logging.info(f"Found {len(all_files)} files in {folder}: {all_files}")
        
        for filename in all_files:
            if filename.endswith('.json') and not filename.startswith('summary_'):
                filepath = os.path.join(folder, filename)
                logging.info(f"Reading interview file: {filename}")
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    data['filename'] = filename
                    interviews.append(data)
        
        # Sort by start_time (most recent first)
        interviews.sort(key=lambda x: x.get('start_time', ''), reverse=True)
        
        logging.info(f"Returning {len(interviews)} scheduled interviews")
        
        return jsonify({
            'success': True,
            'count': len(interviews),
            'interviews': interviews
        })
        
    except Exception as e:
        logging.error(f"Error fetching scheduled interviews: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/interviews/scheduled/<filename>', methods=['GET'])
def get_scheduled_interview_file(filename):
    """Fetch a single scheduled interview JSON"""
    try:
        folder = 'scheduled_interviews'
        safe_name = secure_filename(filename)
        filepath = os.path.join(folder, safe_name)
        
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'Interview record not found'}), 404
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        return jsonify({'success': True, 'data': data})
        
    except Exception as e:
        logging.error(f"Error fetching scheduled interview file: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Add these routes to your Flask app

@app.route('/api/interviews/upcoming', methods=['GET'])
def get_upcoming_interviews():
    """Get upcoming interviews for the next 7 days"""
    try:
        service = get_calendar_service()
        
        # Calculate time range (next 7 days)
        now = datetime.now(timezone.utc).isoformat()
        next_week = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        events_result = service.events().list(
            calendarId='primary',
            timeMin=now,
            timeMax=next_week,
            singleEvents=True,
            orderBy='startTime',
            q='Interview'  # Search for events with "Interview" in title
        ).execute()
        
        events = events_result.get('items', [])
        
        # Format events
        formatted_events = []
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            
            formatted_events.append({
                'id': event['id'],
                'summary': event.get('summary', 'No Title'),
                'description': event.get('description', ''),
                'start_time': start,
                'end_time': end,
                'hangoutLink': event.get('hangoutLink', ''),
                'htmlLink': event.get('htmlLink', '')
            })
        
        return jsonify({
            'success': True,
            'events': formatted_events,
            'count': len(formatted_events)
        })
        
    except Exception as e:
        logging.error(f"Error fetching upcoming interviews: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/interviews/cancel/<event_id>', methods=['DELETE'])
def cancel_interview(event_id):
    """Cancel a scheduled interview"""
    try:
        service = get_calendar_service()
        
        service.events().delete(
            calendarId='primary',
            eventId=event_id
        ).execute()
        
        # Also remove from local storage
        interview_file = os.path.join('scheduled_interviews', f"{event_id}.json")
        if os.path.exists(interview_file):
            os.remove(interview_file)
        
        return jsonify({
            'success': True,
            'message': 'Interview cancelled successfully'
        })
        
    except Exception as e:
        logging.error(f"Error cancelling interview: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/calendar/availability', methods=['GET'])
def get_calendar_availability():
    """Get available time slots for scheduling"""
    try:
        service = get_calendar_service()
        
        # Get busy intervals for next 3 days
        start_time = datetime.now(timezone.utc)
        end_time = start_time + timedelta(days=3)
        
        body = {
            "timeMin": start_time.isoformat(),
            "timeMax": end_time.isoformat(),
            "items": [{"id": "primary"}]
        }
        
        events_result = service.freebusy().query(body=body).execute()
        busy_slots = events_result['calendars']['primary'].get('busy', [])
        
        # Generate available slots (simplified)
        available_slots = []
        current_time = start_time.replace(hour=9, minute=0, second=0, microsecond=0)
        
        while current_time.date() <= end_time.date():
            # Skip weekends
            if current_time.weekday() < 5:  # 0-4 = Monday-Friday
                # Work hours: 9 AM to 5 PM
                slot_end = current_time + timedelta(minutes=45)  # 45-minute slots
                
                if slot_end.hour < 17:  # Within work hours
                    # Check if slot is available
                    slot_available = True
                    for busy in busy_slots:
                        busy_start = datetime.fromisoformat(busy['start'].replace('Z', '+00:00'))
                        busy_end = datetime.fromisoformat(busy['end'].replace('Z', '+00:00'))
                        
                        if (current_time < busy_end and slot_end > busy_start):
                            slot_available = False
                            break
                    
                    if slot_available:
                        available_slots.append({
                            'start': current_time.isoformat(),
                            'end': slot_end.isoformat()
                        })
            
            current_time += timedelta(minutes=60)  # Check every hour
        
        return jsonify({
            'success': True,
            'available_slots': available_slots,
            'count': len(available_slots)
        })
        
    except Exception as e:
        logging.error(f"Error getting calendar availability: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/interviews/schedule', methods=['POST'])
def schedule_interviews():
    """Schedule interviews for all candidates"""
    try:
        data = request.json
        
        # Get scheduling parameters
        start_date_str = data.get('start_date')
        duration_minutes = data.get('duration_minutes', 45)
        buffer_minutes = data.get('buffer_minutes', 15)
        work_hours = tuple(data.get('work_hours', [9, 17]))
        skip_weekends = data.get('skip_weekends', True)
        
        # Parse start date
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        else:
            start_date = None
        
        # Get calendar service
        service = get_calendar_service()
        
        # Initialize start time
        if start_date is None:
            current_time = datetime.now(timezone.utc)
            start_time = (current_time + timedelta(days=1)).replace(
                hour=work_hours[0], minute=0, second=0, microsecond=0
            )
        else:
            start_time = start_date.replace(
                hour=work_hours[0], minute=0, second=0, microsecond=0, tzinfo=timezone.utc
            )
        
        # Skip weekends if needed
        if skip_weekends:
            while start_time.weekday() >= 5:
                start_time += timedelta(days=1)
        
        # Schedule all candidates
        candidates = get_all_candidates()
        scheduled = []
        skipped = []
        
        for candidate in candidates:
            # Check if we need to move to next day
            interview_end_hour = start_time.hour + (start_time.minute + duration_minutes) / 60
            if interview_end_hour >= work_hours[1]:
                start_time = start_time.replace(hour=work_hours[0], minute=0) + timedelta(days=1)
                
                if skip_weekends:
                    while start_time.weekday() >= 5:
                        start_time += timedelta(days=1)
            
            # Schedule interview
            end_time = schedule_interview(service, candidate, start_time, duration_minutes=duration_minutes)
            
            if end_time:
                scheduled.append({
                    'candidate': candidate.get('full_name'),
                    'email': candidate.get('email'),
                    'time': start_time.isoformat()
                })
                start_time = end_time + timedelta(minutes=buffer_minutes)
            else:
                skipped.append(candidate.get('full_name'))
        
        return jsonify({
            'success': True,
            'message': f'Scheduled {len(scheduled)} interviews',
            'scheduled': scheduled,
            'skipped': skipped
        })
        
    except Exception as e:
        logging.error(f"Error scheduling interviews: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/interviews/schedule-single', methods=['POST'])
def schedule_single_interview():
    """Schedule interview for a single candidate"""
    try:
        data = request.json
        
        candidate_id = data.get('candidate_id')
        start_time_str = data.get('start_time')
        duration_minutes = data.get('duration_minutes', 45)
        
        if not candidate_id or not start_time_str:
            return jsonify({
                'success': False,
                'error': 'candidate_id and start_time required'
            }), 400
        
        # Get candidate
        filepath = os.path.join('enriched_json', f"{candidate_id}.json")
        if not os.path.exists(filepath):
            filepath = os.path.join('parsed_json', f"{candidate_id}.json")
        
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'Candidate not found'}), 404
        
        with open(filepath, 'r') as f:
            candidate = json.load(f)
        
        # Parse start time
        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        
        # Get calendar service and schedule
        service = get_calendar_service()
        end_time = schedule_interview(service, candidate, start_time, duration_minutes=duration_minutes)
        
        if end_time:
            return jsonify({
                'success': True,
                'message': 'Interview scheduled successfully',
                'candidate': candidate.get('full_name'),
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to schedule interview'
            }), 500
            
    except Exception as e:
        logging.error(f"Error scheduling single interview: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --------------------------
# Statistics Routes
# --------------------------

@app.route('/api/stats', methods=['GET'])
def get_statistics():
    """Get overall statistics"""
    try:
        # Count files in each folder
        resumes_count = len([f for f in os.listdir(UPLOAD_FOLDER) if allowed_file(f)]) if os.path.exists(UPLOAD_FOLDER) else 0
        parsed_count = len([f for f in os.listdir('parsed_json') if f.endswith('.json')]) if os.path.exists('parsed_json') else 0
        enriched_count = len([f for f in os.listdir('enriched_json') if f.endswith('.json')]) if os.path.exists('enriched_json') else 0
        
        # Count scheduled interviews
        scheduled_count = 0
        if os.path.exists('scheduled_interviews'):
            scheduled_count = len([f for f in os.listdir('scheduled_interviews') 
                                 if f.endswith('.json') and not f.startswith('summary_')])
        
        # Get skill distribution
        candidates = get_all_candidates()
        all_skills = {}
        for candidate in candidates:
            for skill in candidate.get('skills', []):
                all_skills[skill] = all_skills.get(skill, 0) + 1
        
        top_skills = sorted(all_skills.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return jsonify({
            'success': True,
            'stats': {
                'total_resumes': resumes_count,
                'parsed_resumes': parsed_count,
                'enriched_candidates': enriched_count,
                'scheduled_interviews': scheduled_count,
                'top_skills': [{'skill': s[0], 'count': s[1]} for s in top_skills]
            }
        })
    except Exception as e:
        logging.error(f"Error getting statistics: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --------------------------
# Run Server
# --------------------------

if __name__ == '__main__':
    # Create necessary folders
    os.makedirs('resumes', exist_ok=True)
    os.makedirs('parsed_text', exist_ok=True)
    os.makedirs('parsed_json', exist_ok=True)
    os.makedirs('enriched_json', exist_ok=True)
    os.makedirs('scheduled_interviews', exist_ok=True)
    
    logging.info("🚀 Starting AI Recruiter API Server...")
    logging.info("📍 Server running at http://localhost:5000")
    logging.info("📚 API Documentation available at /api/health")
    
    app.run(debug=True, host='0.0.0.0', port=5000)