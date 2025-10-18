# app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import logging
import hashlib
from datetime import datetime, timedelta, timezone
from werkzeug.utils import secure_filename
import subprocess
import sys

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
# Import Our Modules (with error handling)
# --------------------------
try:
    from fetch_resumes import authenticate_gmail, fetch_resume_emails, download_attachments
    from parse_resumes import extract_text_from_file, parse_all_resumes as parse_resumes_module
    from gemini_parser import parse_resume_text, process_all_resumes as gemini_process_all
    from linkedin_enricher import enrich_candidate, process_all_candidates as enrich_all_candidates
    from schedule_interviews import get_calendar_service, schedule_interview, process_all_candidates as schedule_all_candidates
    MODULES_LOADED = True
except ImportError as e:
    logging.warning(f"Some modules failed to load: {e}")
    MODULES_LOADED = False

# --------------------------
# Helper Functions
# --------------------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def calculate_file_hash(file_path):
    """Calculate MD5 hash of file content for duplicate detection"""
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

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
                with open(os.path.join(folder, filename), 'r', encoding='utf-8') as f:
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

def run_pipeline_stage(script_name, description):
    """Run a pipeline stage with proper error handling"""
    logging.info(f"🚀 Starting: {description}")
    
    try:
        result = subprocess.run([sys.executable, script_name], 
                              capture_output=True, text=True, check=True)
        logging.info(f"✅ Completed: {description}")
        return {
            'success': True,
            'description': description,
            'output': result.stdout[-1000:]  # Last 1000 chars
        }
    except subprocess.CalledProcessError as e:
        logging.error(f"❌ Failed: {description}")
        return {
            'success': False,
            'description': description,
            'error': e.stderr
        }
    except Exception as e:
        logging.error(f"❌ Unexpected error in {description}: {e}")
        return {
            'success': False,
            'description': description,
            'error': str(e)
        }

# --------------------------
# API Routes
# --------------------------

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0',
        'modules_loaded': MODULES_LOADED
    })

# --------------------------
# Pipeline Control Routes
# --------------------------

@app.route('/api/pipeline/run', methods=['POST'])
def run_complete_pipeline():
    """Run the complete resume processing pipeline"""
    try:
        start_time = datetime.now()
        
        # Pipeline stages
        stages = [
            ("fetch_resumes.py", "1. Fetch resumes from Gmail"),
            ("parse_resumes.py", "2. Parse resume files to text"),
            ("gemini_parser.py", "3. Extract structured data with Gemini"),
            ("linkedin_enricher.py", "4. Enrich candidate data"),
            ("schedule_interviews.py", "5. Schedule interviews")
        ]
        
        results = []
        for script, description in stages:
            result = run_pipeline_stage(script, description)
            results.append(result)
            
            if not result['success']:
                break  # Stop pipeline on failure
        
        # Summary
        success_count = sum(1 for r in results if r['success'])
        end_time = datetime.now()
        duration = end_time - start_time
        
        return jsonify({
            'success': True,
            'results': results,
            'summary': {
                'completed_stages': success_count,
                'total_stages': len(stages),
                'duration_seconds': duration.total_seconds(),
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat()
            }
        })
        
    except Exception as e:
        logging.error(f"Error running pipeline: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/pipeline/stages', methods=['GET'])
def get_pipeline_stages():
    """Get available pipeline stages"""
    stages = [
        {
            'id': 'fetch',
            'name': 'Fetch Resumes',
            'description': 'Download resumes from Gmail',
            'script': 'fetch_resumes.py'
        },
        {
            'id': 'parse',
            'name': 'Parse Resumes',
            'description': 'Extract text from resume files',
            'script': 'parse_resumes.py'
        },
        {
            'id': 'gemini',
            'name': 'AI Parsing',
            'description': 'Extract structured data using Gemini AI',
            'script': 'gemini_parser.py'
        },
        {
            'id': 'enrich',
            'name': 'Enrich Data',
            'description': 'Add LinkedIn URLs and additional info',
            'script': 'linkedin_enricher.py'
        },
        {
            'id': 'schedule',
            'name': 'Schedule Interviews',
            'description': 'Schedule interviews in Google Calendar',
            'script': 'schedule_interviews.py'
        }
    ]
    
    return jsonify({
        'success': True,
        'stages': stages
    })

@app.route('/api/pipeline/run-stage', methods=['POST'])
def run_single_stage():
    """Run a single pipeline stage"""
    try:
        data = request.json
        stage_id = data.get('stage_id')
        
        stage_map = {
            'fetch': ('fetch_resumes.py', 'Fetch resumes from Gmail'),
            'parse': ('parse_resumes.py', 'Parse resume files to text'),
            'gemini': ('gemini_parser.py', 'Extract structured data with Gemini'),
            'enrich': ('linkedin_enricher.py', 'Enrich candidate data'),
            'schedule': ('schedule_interviews.py', 'Schedule interviews')
        }
        
        if stage_id not in stage_map:
            return jsonify({
                'success': False,
                'error': f'Invalid stage ID: {stage_id}'
            }), 400
        
        script, description = stage_map[stage_id]
        result = run_pipeline_stage(script, description)
        
        return jsonify({
            'success': result['success'],
            'result': result
        })
        
    except Exception as e:
        logging.error(f"Error running pipeline stage: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --------------------------
# Gmail Integration Routes
# --------------------------

@app.route('/api/gmail/fetch', methods=['POST'])
def fetch_from_gmail():
    """Fetch resumes from Gmail"""
    if not MODULES_LOADED:
        return jsonify({'success': False, 'error': 'Gmail module not loaded'}), 500
    
    try:
        data = request.json or {}
        query = data.get('query', 'has:attachment')
        
        logging.info("Authenticating with Gmail...")
        service = authenticate_gmail()
        
        logging.info(f"Fetching emails with query: {query}")
        emails = fetch_resume_emails(service, query)
        
        if not emails:
            return jsonify({
                'success': True,
                'message': 'No new emails found with attachments',
                'count': 0
            })
        
        logging.info("Downloading attachments...")
        results = download_attachments(service, emails)
        
        return jsonify({
            'success': True,
            'message': f'Successfully processed {len(emails)} emails',
            'results': results
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
    """Upload a resume file with duplicate detection"""
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
            
            # Check for duplicate file content
            file_data = file.read()
            file_hash = hashlib.md5(file_data).hexdigest()
            
            # Check existing files for duplicates
            existing_hashes = set()
            if os.path.exists(UPLOAD_FOLDER):
                for existing_file in os.listdir(UPLOAD_FOLDER):
                    if allowed_file(existing_file):
                        existing_path = os.path.join(UPLOAD_FOLDER, existing_file)
                        try:
                            existing_hash = calculate_file_hash(existing_path)
                            existing_hashes.add(existing_hash)
                        except Exception as e:
                            logging.warning(f"Could not calculate hash for {existing_file}: {e}")
            
            if file_hash in existing_hashes:
                return jsonify({
                    'success': False,
                    'error': 'Duplicate resume file detected'
                }), 409  # Conflict status code
            
            # Save the file
            file.seek(0)  # Reset file pointer
            file.save(filepath)
            
            return jsonify({
                'success': True,
                'message': 'File uploaded successfully',
                'filename': filename,
                'file_hash': file_hash
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
                        'uploaded_at': datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
                        'file_type': filename.split('.')[-1].upper()
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

@app.route('/api/resumes/parse-all', methods=['POST'])
def parse_all_resumes():
    """Parse all resumes in the upload folder"""
    try:
        results = parse_resumes_module()
        
        return jsonify({
            'success': True,
            'message': 'Resume parsing completed',
            'results': results
        })
    except Exception as e:
        logging.error(f"Error parsing all resumes: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --------------------------
# Candidate Management Routes
# --------------------------

@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    """Get all candidates with filtering"""
    try:
        candidates = get_all_candidates()
        
        # Apply filters if provided
        search = request.args.get('search', '').lower()
        skill = request.args.get('skill', '').lower()
        status = request.args.get('status', '').lower()
        
        filtered_candidates = candidates
        
        if search:
            filtered_candidates = [c for c in filtered_candidates if 
                                 search in c.get('full_name', '').lower() or
                                 search in c.get('email', '').lower() or
                                 search in c.get('current_company', '').lower()]
        
        if skill:
            filtered_candidates = [c for c in filtered_candidates if 
                                 skill in ' '.join(c.get('skills', [])).lower()]
        
        if status == 'scheduled':
            # Get scheduled interviews
            scheduled_folder = 'scheduled_interviews'
            scheduled_candidates = set()
            if os.path.exists(scheduled_folder):
                for filename in os.listdir(scheduled_folder):
                    if filename.endswith('.json') and not filename.startswith('summary_'):
                        candidate_name = filename.split('_')[0]
                        scheduled_candidates.add(candidate_name.lower())
            
            filtered_candidates = [c for c in filtered_candidates if 
                                 c.get('full_name', '').lower().replace(' ', '_') in scheduled_candidates]
        
        return jsonify({
            'success': True,
            'candidates': filtered_candidates,
            'count': len(filtered_candidates),
            'total': len(candidates)
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
        
        with open(filepath, 'r', encoding='utf-8') as f:
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
        results = enrich_all_candidates()
        
        return jsonify({
            'success': True,
            'message': 'Candidate enrichment completed',
            'results': results
        })
    except Exception as e:
        logging.error(f"Error enriching candidates: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --------------------------
# AI Processing Routes
# --------------------------

@app.route('/api/ai/parse', methods=['POST'])
def parse_with_ai():
    """Parse resumes using Gemini AI"""
    try:
        results = gemini_process_all()
        
        return jsonify({
            'success': True,
            'message': 'AI parsing completed',
            'results': results
        })
    except Exception as e:
        logging.error(f"Error in AI parsing: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --------------------------
# Interview Scheduling Routes
# --------------------------

@app.route('/api/interviews/schedule', methods=['POST'])
def schedule_interviews():
    """Schedule interviews for all candidates"""
    try:
        data = request.json or {}
        
        results = schedule_all_candidates(
            duration_minutes=data.get('duration_minutes', 45),
            buffer_minutes=data.get('buffer_minutes', 15),
            work_hours=tuple(data.get('work_hours', [9, 17])),
            skip_weekends=data.get('skip_weekends', True)
        )
        
        return jsonify({
            'success': True,
            'message': 'Interview scheduling completed',
            'results': results
        })
    except Exception as e:
        logging.error(f"Error scheduling interviews: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/interviews/scheduled', methods=['GET'])
def get_scheduled_interviews():
    """Get all scheduled interviews"""
    try:
        folder = 'scheduled_interviews'
        interviews = []
        
        if not os.path.exists(folder):
            return jsonify({
                'success': True,
                'interviews': [],
                'count': 0
            })
        
        for filename in os.listdir(folder):
            if filename.endswith('.json') and not filename.startswith('summary_'):
                filepath = os.path.join(folder, filename)
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    data['filename'] = filename
                    interviews.append(data)
        
        # Sort by start_time (most recent first)
        interviews.sort(key=lambda x: x.get('start_time', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'count': len(interviews),
            'interviews': interviews
        })
        
    except Exception as e:
        logging.error(f"Error fetching scheduled interviews: {e}")
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
        experience_levels = {}
        companies = {}
        
        for candidate in candidates:
            # Skills
            for skill in candidate.get('skills', []):
                all_skills[skill] = all_skills.get(skill, 0) + 1
            
            # Experience levels
            exp = candidate.get('years_of_experience', 'Unknown')
            experience_levels[exp] = experience_levels.get(exp, 0) + 1
            
            # Companies
            company = candidate.get('current_company', 'Unknown')
            if company != 'Not specified':
                companies[company] = companies.get(company, 0) + 1
        
        top_skills = sorted(all_skills.items(), key=lambda x: x[1], reverse=True)[:10]
        top_companies = sorted(companies.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return jsonify({
            'success': True,
            'stats': {
                'total_resumes': resumes_count,
                'parsed_candidates': parsed_count,
                'enriched_candidates': enriched_count,
                'scheduled_interviews': scheduled_count,
                'top_skills': [{'skill': s[0], 'count': s[1]} for s in top_skills],
                'experience_levels': experience_levels,
                'top_companies': [{'company': c[0], 'count': c[1]} for c in top_companies]
            }
        })
    except Exception as e:
        logging.error(f"Error getting statistics: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --------------------------
# System Routes
# --------------------------

@app.route('/api/system/cleanup', methods=['POST'])
def system_cleanup():
    """Clean up temporary files and reset state"""
    try:
        data = request.json or {}
        cleanup_type = data.get('type', 'all')
        
        folders_to_clean = []
        
        if cleanup_type in ['parsed', 'all']:
            folders_to_clean.extend(['parsed_text', 'parsed_json'])
        
        if cleanup_type in ['enriched', 'all']:
            folders_to_clean.append('enriched_json')
        
        if cleanup_type in ['interviews', 'all']:
            folders_to_clean.append('scheduled_interviews')
        
        if cleanup_type in ['resumes', 'all']:
            folders_to_clean.append('resumes')
        
        results = {}
        for folder in folders_to_clean:
            if os.path.exists(folder):
                file_count = 0
                for filename in os.listdir(folder):
                    filepath = os.path.join(folder, filename)
                    if os.path.isfile(filepath):
                        os.remove(filepath)
                        file_count += 1
                results[folder] = f'Removed {file_count} files'
            else:
                results[folder] = 'Folder does not exist'
        
        # Also clean tracking files
        tracking_files = [
            'processed_emails.json', 'processed_text_hashes.json',
            'processed_candidates.json', 'enriched_candidates.json',
            'scheduled_candidates.json'
        ]
        
        for tracking_file in tracking_files:
            if os.path.exists(tracking_file):
                os.remove(tracking_file)
                results[tracking_file] = 'Removed tracking file'
        
        return jsonify({
            'success': True,
            'message': 'Cleanup completed',
            'results': results
        })
        
    except Exception as e:
        logging.error(f"Error during cleanup: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/system/status', methods=['GET'])
def system_status():
    """Get system status and folder structure"""
    try:
        folders = [
            'resumes', 'parsed_text', 'parsed_json', 
            'enriched_json', 'scheduled_interviews'
        ]
        
        status = {}
        for folder in folders:
            if os.path.exists(folder):
                files = [f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))]
                status[folder] = {
                    'exists': True,
                    'file_count': len(files),
                    'files': files[:10]  # First 10 files
                }
            else:
                status[folder] = {
                    'exists': False,
                    'file_count': 0,
                    'files': []
                }
        
        # Check for tracking files
        tracking_files = [
            'processed_emails.json', 'processed_text_hashes.json',
            'processed_candidates.json', 'enriched_candidates.json',
            'scheduled_candidates.json'
        ]
        
        tracking_status = {}
        for tracking_file in tracking_files:
            tracking_status[tracking_file] = os.path.exists(tracking_file)
        
        return jsonify({
            'success': True,
            'folders': status,
            'tracking_files': tracking_status,
            'modules_loaded': MODULES_LOADED
        })
        
    except Exception as e:
        logging.error(f"Error getting system status: {e}")
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
    logging.info("🛡️  Duplicate prevention: ENABLED")
    
    app.run(debug=True, host='0.0.0.0', port=5000)