# parse_resumes.py
import os
import logging
from PyPDF2 import PdfReader
import docx2txt

# Setup logging
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO
)

def extract_text_from_file(file_path):
    """
    Extract text from PDF or DOCX file with improved error handling
    
    Args:
        file_path: Path to the file to extract text from
        
    Returns:
        str: Extracted text content
    """
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    
    if ext == ".pdf":
        try:
            with open(file_path, "rb") as f:
                reader = PdfReader(f)
                logging.info(f"📄 Reading PDF with {len(reader.pages)} pages")
                
                for i, page in enumerate(reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                            logging.info(f"  ✓ Extracted text from page {i+1}")
                    except Exception as e:
                        logging.warning(f"  ⚠️ Error extracting page {i+1}: {e}")
                        continue
                        
            if not text.strip():
                logging.warning(f"⚠️ No text extracted from PDF {file_path}")
                
        except Exception as e:
            logging.error(f"❌ Error reading PDF {file_path}: {e}")
            
    elif ext == ".docx" or ext == ".doc":
        try:
            text = docx2txt.process(file_path)
            logging.info(f"📄 Extracted text from DOCX: {len(text)} characters")
            
            if not text.strip():
                logging.warning(f"⚠️ No text extracted from DOCX {file_path}")
                
        except Exception as e:
            logging.error(f"❌ Error reading DOCX {file_path}: {e}")
    else:
        logging.warning(f"⚠️ Skipping unsupported file type: {file_path}")
    
    return text

def parse_all_resumes(input_folder="resumes", output_folder="parsed_text"):
    """
    Parse all resumes in folder and save as .txt files
    
    Args:
        input_folder: Folder containing resume files
        output_folder: Folder to save extracted text
        
    Returns:
        dict: Summary of parsing results
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        logging.info(f"📁 Created output folder: {output_folder}")
    
    if not os.path.exists(input_folder):
        logging.error(f"❌ Input folder not found: {input_folder}")
        return {'success': 0, 'failed': 0, 'skipped': 0}
    
    results = {'success': 0, 'failed': 0, 'skipped': 0}
    
    files = [f for f in os.listdir(input_folder) if os.path.isfile(os.path.join(input_folder, f))]
    logging.info(f"📊 Found {len(files)} files in {input_folder}")
    
    for filename in files:
        file_path = os.path.join(input_folder, filename)
        ext = os.path.splitext(filename)[1].lower()
        
        if ext not in ['.pdf', '.docx', '.doc']:
            logging.info(f"⏭️  Skipping {filename} (unsupported format)")
            results['skipped'] += 1
            continue
        
        logging.info(f"\n{'='*60}")
        logging.info(f"Processing: {filename}")
        logging.info(f"{'='*60}")
        
        text = extract_text_from_file(file_path)
        
        if text.strip():
            txt_filename = os.path.splitext(filename)[0] + ".txt"
            output_path = os.path.join(output_folder, txt_filename)
            
            try:
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(text)
                
                word_count = len(text.split())
                logging.info(f"✅ Parsed text saved: {txt_filename}")
                logging.info(f"   📊 Stats: {len(text)} chars, {word_count} words")
                results['success'] += 1
                
            except Exception as e:
                logging.error(f"❌ Error saving text file: {e}")
                results['failed'] += 1
        else:
            logging.warning(f"⚠️ No text extracted from {filename}")
            results['failed'] += 1
    
    # Print summary
    logging.info(f"\n{'='*60}")
    logging.info("📊 PARSING SUMMARY")
    logging.info(f"{'='*60}")
    logging.info(f"✅ Success: {results['success']}")
    logging.info(f"❌ Failed: {results['failed']}")
    logging.info(f"⏭️  Skipped: {results['skipped']}")
    logging.info(f"{'='*60}\n")
    
    return results

if __name__ == "__main__":
    logging.info("🚀 Starting resume text extraction...")
    results = parse_all_resumes()
    
    if results['success'] > 0:
        logging.info(f"✅ Step 2 completed! Parsed text is in 'parsed_text/' folder.")
    else:
        logging.error("❌ No resumes were successfully parsed.")