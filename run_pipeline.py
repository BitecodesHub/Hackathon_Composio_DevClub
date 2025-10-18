# run_pipeline.py
#!/usr/bin/env python3
"""
Master controller for the resume processing pipeline
Runs all stages with comprehensive duplicate prevention
"""

import os
import logging
import subprocess
import sys
from datetime import datetime

# Setup logging
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
    handlers=[
        logging.FileHandler("pipeline.log"),
        logging.StreamHandler()
    ]
)

def run_stage(script_name, description):
    """Run a pipeline stage with proper error handling"""
    logging.info(f"\n{'='*80}")
    logging.info(f"🚀 STARTING: {description}")
    logging.info(f"{'='*80}")
    
    try:
        result = subprocess.run([sys.executable, script_name], 
                              capture_output=True, text=True, check=True)
        logging.info(f"✅ COMPLETED: {description}")
        if result.stdout:
            logging.info(f"Output: {result.stdout[-500:]}")  # Last 500 chars
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"❌ FAILED: {description}")
        logging.error(f"Error: {e.stderr}")
        return False
    except Exception as e:
        logging.error(f"❌ UNEXPECTED ERROR in {description}: {e}")
        return False

def main():
    """Run the complete pipeline"""
    start_time = datetime.now()
    logging.info(f"🎯 STARTING RESUME PROCESSING PIPELINE")
    logging.info(f"📅 Started at: {start_time}")
    logging.info(f"🔍 Duplicate prevention: ENABLED at all stages")
    
    # Pipeline stages
    stages = [
        ("fetch_resumes.py", "1. Fetch resumes from Gmail"),
        ("parse_resumes.py", "2. Parse resume files to text"),
        ("gemini_parser.py", "3. Extract structured data with Gemini"),
        ("linkedin_enricher.py", "4. Enrich candidate data"),
        ("schedule_interviews.py", "5. Schedule interviews")
    ]
    
    # Run all stages
    success_count = 0
    for script, description in stages:
        if run_stage(script, description):
            success_count += 1
        else:
            logging.error(f"⏹️ Pipeline stopped at: {description}")
            break
    
    # Summary
    end_time = datetime.now()
    duration = end_time - start_time
    
    logging.info(f"\n{'='*80}")
    logging.info("📊 PIPELINE EXECUTION SUMMARY")
    logging.info(f"{'='*80}")
    logging.info(f"✅ Completed stages: {success_count}/{len(stages)}")
    logging.info(f"⏱️ Total duration: {duration}")
    logging.info(f"🏁 Finished at: {end_time}")
    
    if success_count == len(stages):
        logging.info("🎉 ALL STAGES COMPLETED SUCCESSFULLY!")
    else:
        logging.warning(f"⚠️ Pipeline incomplete: {success_count}/{len(stages)} stages completed")

if __name__ == "__main__":
    main()