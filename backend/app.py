import os
import hashlib
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 1. REAL IPFS UPLOAD (Pinata)
def upload_to_ipfs(file_path):
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {
        "pinata_api_key": os.getenv("PINATA_API_KEY"),
        "pinata_secret_api_key": os.getenv("PINATA_SECRET_API_KEY")
    }
    with open(file_path, 'rb') as file:
        files = {'file': file}
        response = requests.post(url, files=files, headers=headers)
        if response.status_code == 200:
            return response.json()['IpfsHash']
        return None

# 2. REAL TEXT EXTRACTION
def extract_text_from_pdf(file_path):
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text[:6000] # Limit characters for AI context window

# 3. REAL AI ANALYSIS (Groq / Llama 3)
def analyze_with_groq(text):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    prompt = f"""
    Extract the following details from this bond document in strict JSON format:
    - bond_name (string)
    - isin (string)
    - yield_rate (number, e.g., 7.2)
    - risk_rating (string)
    
    Document Text:
    {text}
    
    Return ONLY JSON. No markdown.
    """
    
    completion = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )
    
    try:
        return json.loads(completion.choices[0].message.content)
    except:
        return {"bond_name": "Unknown", "isin": "Unknown", "yield_rate": 0, "risk_rating": "Unknown"}

# 4. HASHING (Trust Layer)
def generate_sha256(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

@app.route('/analyze_bond', methods=['POST'])
def analyze_bond():
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    
    file = request.files['file']
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    # A. Generate Hash
    doc_hash = generate_sha256(file_path)
    
    # B. Upload to IPFS
    print("Uploading to IPFS...")
    ipfs_cid = upload_to_ipfs(file_path)
    if not ipfs_cid:
        return jsonify({"error": "IPFS Upload Failed"}), 500

    # C. Extract Text & Analyze with AI
    print("Analyzing with Llama 3...")
    pdf_text = extract_text_from_pdf(file_path)
    ai_data = analyze_with_groq(pdf_text)

    # Normalize Yield for Blockchain (7.2% -> 720)
    blockchain_yield = int(float(ai_data.get('yield_rate', 0)) * 100)

    return jsonify({
        "success": True,
        "hash": doc_hash,
        "ipfs_cid": ipfs_cid,
        "ai_data": {
            "bond_name": ai_data.get('bond_name'),
            "isin": ai_data.get('isin'),
            "risk_rating": ai_data.get('risk_rating'),
            "detected_yield": blockchain_yield,
            "raw_yield": ai_data.get('yield_rate')
        }
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)