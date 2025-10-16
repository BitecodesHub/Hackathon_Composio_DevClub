import os
import json
import logging

# --------------------------
# Setup logging
# --------------------------
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO
)

# --------------------------
# Helper functions
# --------------------------
def enrich_candidate(candidate):
    """
    Add LinkedIn URL and current role to candidate JSON.
    Currently uses a placeholder URL. Replace with actual API or scraping logic.
    """
    name = candidate.get("full_name") or candidate.get("name") or "unknown"
    linkedin_url = f"https://www.linkedin.com/in/{name.replace(' ', '-').lower()}/"
    
    candidate["linkedin_url"] = linkedin_url
    candidate["current_role"] = candidate.get("current_role") or "Unknown"
    candidate["current_company"] = candidate.get("current_company") or "Unknown"
    return candidate

def process_all_candidates(input_folder="parsed_json", output_folder="enriched_json"):
    """
    Read parsed JSON resumes, enrich them with LinkedIn info, and save to new folder.
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for filename in os.listdir(input_folder):
        if filename.endswith(".json"):
            file_path = os.path.join(input_folder, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                try:
                    candidate = json.load(f)
                except json.JSONDecodeError as e:
                    logging.error(f"❌ Failed to read JSON {filename}: {e}")
                    continue

            logging.info(f"🔗 Enriching {filename} with LinkedIn info...")
            enriched_candidate = enrich_candidate(candidate)

            out_path = os.path.join(output_folder, filename)
            with open(out_path, "w", encoding="utf-8") as out:
                json.dump(enriched_candidate, out, indent=2)
            logging.info(f"✅ Saved enriched data: {filename}")

# --------------------------
# Entry point
# --------------------------
if __name__ == "__main__":
    logging.info("Starting LinkedIn enrichment...")
    process_all_candidates()
    logging.info("✅ All candidates enriched! Data saved in 'enriched_json/' folder.")
