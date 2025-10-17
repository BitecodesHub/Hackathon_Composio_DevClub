# linkedin_enricher.py
import os
import json
import logging
import re

# Setup logging
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO
)

def clean_name_for_url(name):
    """
    Convert name to LinkedIn URL format
    Example: "John Doe" -> "john-doe"
    """
    if not name:
        return "unknown"
    
    # Remove special characters and extra spaces
    cleaned = re.sub(r'[^a-zA-Z\s-]', '', name)
    cleaned = re.sub(r'\s+', '-', cleaned.strip())
    return cleaned.lower()

def generate_linkedin_url(full_name):
    """
    Generate a LinkedIn profile URL from the candidate's name
    
    Args:
        full_name: Candidate's full name
        
    Returns:
        str: LinkedIn profile URL
    """
    cleaned_name = clean_name_for_url(full_name)
    return f"https://www.linkedin.com/in/{cleaned_name}/"

def enrich_candidate(candidate):
    """
    Enrich candidate data with additional information
    
    This function adds:
    - LinkedIn URL (generated from name)
    - Normalized current_role and current_company
    - Additional metadata
    
    Args:
        candidate: Dictionary containing candidate information
        
    Returns:
        dict: Enriched candidate data
    """
    # Get full name from various possible fields
    full_name = (
        candidate.get("full_name") or 
        candidate.get("name") or 
        "Unknown Candidate"
    )
    
    # Normalize the full_name field
    candidate["full_name"] = full_name
    
    # Generate LinkedIn URL
    linkedin_url = generate_linkedin_url(full_name)
    candidate["linkedin_url"] = linkedin_url
    
    # Ensure current_role exists
    if not candidate.get("current_role"):
        candidate["current_role"] = "Not specified"
    
    # Ensure current_company exists
    if not candidate.get("current_company"):
        candidate["current_company"] = "Not specified"
    
    # Ensure skills is a list
    if not candidate.get("skills"):
        candidate["skills"] = []
    elif isinstance(candidate["skills"], str):
        # If skills is a string, split by comma
        candidate["skills"] = [s.strip() for s in candidate["skills"].split(",")]
    
    # Add metadata
    candidate["enrichment_status"] = "completed"
    candidate["profile_completeness"] = calculate_profile_completeness(candidate)
    
    # Add years of experience estimation (if not present)
    if not candidate.get("years_of_experience"):
        candidate["years_of_experience"] = estimate_experience(candidate)
    
    logging.info(f"✓ Enriched profile for {full_name}")
    logging.info(f"  LinkedIn: {linkedin_url}")
    logging.info(f"  Profile completeness: {candidate['profile_completeness']}%")
    
    return candidate

def calculate_profile_completeness(candidate):
    """
    Calculate how complete a candidate profile is (0-100%)
    
    Args:
        candidate: Candidate dictionary
        
    Returns:
        int: Completeness percentage
    """
    fields = [
        "full_name",
        "email",
        "phone",
        "skills",
        "education",
        "experience_summary",
        "current_company",
        "current_role"
    ]
    
    filled_fields = sum(1 for field in fields if candidate.get(field))
    return int((filled_fields / len(fields)) * 100)

def estimate_experience(candidate):
    """
    Estimate years of experience based on available data
    
    Args:
        candidate: Candidate dictionary
        
    Returns:
        str: Estimated experience level
    """
    experience_summary = candidate.get("experience_summary", "").lower()
    
    # Look for year mentions
    years_match = re.search(r'(\d+)\s*(?:\+)?\s*years?', experience_summary)
    if years_match:
        years = int(years_match.group(1))
        if years < 2:
            return "0-2 years"
        elif years < 5:
            return "2-5 years"
        elif years < 10:
            return "5-10 years"
        else:
            return "10+ years"
    
    # Check for seniority indicators
    if any(word in experience_summary for word in ['senior', 'lead', 'principal', 'staff']):
        return "5-10 years"
    elif any(word in experience_summary for word in ['junior', 'entry', 'associate']):
        return "0-2 years"
    else:
        return "2-5 years"

def process_all_candidates(input_folder="parsed_json", output_folder="enriched_json"):
    """
    Process all candidates and enrich their data
    
    Args:
        input_folder: Folder containing parsed JSON files
        output_folder: Folder to save enriched data
        
    Returns:
        dict: Summary of enrichment process
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        logging.info(f"📁 Created output folder: {output_folder}")
    
    if not os.path.exists(input_folder):
        logging.error(f"❌ Input folder not found: {input_folder}")
        return {'success': 0, 'failed': 0}
    
    results = {'success': 0, 'failed': 0}
    files = [f for f in os.listdir(input_folder) if f.endswith('.json')]
    
    logging.info(f"🔗 Starting LinkedIn enrichment for {len(files)} candidates...")
    logging.info("="*60)
    
    for filename in files:
        file_path = os.path.join(input_folder, filename)
        
        try:
            # Read candidate data
            with open(file_path, "r", encoding="utf-8") as f:
                candidate = json.load(f)
            
            logging.info(f"\nProcessing: {filename}")
            
            # Enrich candidate data
            enriched_candidate = enrich_candidate(candidate)
            
            # Save enriched data
            out_path = os.path.join(output_folder, filename)
            with open(out_path, "w", encoding="utf-8") as out:
                json.dump(enriched_candidate, out, indent=2, ensure_ascii=False)
            
            logging.info(f"✅ Saved enriched data: {filename}")
            results['success'] += 1
            
        except json.JSONDecodeError as e:
            logging.error(f"❌ Failed to read JSON {filename}: {e}")
            results['failed'] += 1
        except Exception as e:
            logging.error(f"❌ Error processing {filename}: {e}")
            results['failed'] += 1
    
    # Print summary
    logging.info(f"\n{'='*60}")
    logging.info("📊 ENRICHMENT SUMMARY")
    logging.info(f"{'='*60}")
    logging.info(f"✅ Success: {results['success']}")
    logging.info(f"❌ Failed: {results['failed']}")
    logging.info(f"{'='*60}\n")
    
    return results

# --------------------------
# Entry point
# --------------------------
if __name__ == "__main__":
    logging.info("🚀 Starting LinkedIn enrichment process...")
    results = process_all_candidates()
    
    if results['success'] > 0:
        logging.info(f"✅ All candidates enriched! Data saved in 'enriched_json/' folder.")
    else:
        logging.error("❌ No candidates were successfully enriched.")