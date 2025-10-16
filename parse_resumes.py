# parse_resumes.py
import os
from PyPDF2 import PdfReader
import docx2txt

def extract_text_from_file(file_path):
    """Extract text from PDF or DOCX file"""
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    if ext == ".pdf":
        try:
            with open(file_path, "rb") as f:
                reader = PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            print(f"❌ Error reading PDF {file_path}: {e}")
    elif ext == ".docx":
        try:
            text = docx2txt.process(file_path)
        except Exception as e:
            print(f"❌ Error reading DOCX {file_path}: {e}")
    else:
        print(f"Skipping unsupported file: {file_path}")
    return text

def parse_all_resumes(input_folder="resumes", output_folder="parsed_text"):
    """Parse all resumes in folder and save as .txt files"""
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for filename in os.listdir(input_folder):
        file_path = os.path.join(input_folder, filename)
        text = extract_text_from_file(file_path)
        if text.strip():
            txt_filename = os.path.splitext(filename)[0] + ".txt"
            with open(os.path.join(output_folder, txt_filename), "w", encoding="utf-8") as f:
                f.write(text)
            print(f"✅ Parsed text saved for {filename}")
        else:
            print(f"⚠️ No text extracted from {filename}")

if __name__ == "__main__":
    print("Extracting text from resumes in 'resumes/'...")
    parse_all_resumes()
    print("✅ Step 2 completed! Parsed text is in 'parsed_text/' folder.")
