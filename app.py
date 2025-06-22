from flask import Flask, request, jsonify
from flask_cors import CORS
import clip
import torch
from PIL import Image
import requests
import json
import os
import io  # Add this import
import numpy as np  # Add this import
from supabase import create_client, Client
import uuid
from dotenv import load_dotenv


# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Supabase
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')
supabase = create_client(supabase_url, supabase_key)

# Initialize CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# UI elements for analysis
ui_elements = [
    "login form", "search bar", "navigation menu", "colorful buttons",
    "footer links", "large header text", "minimalist design",
    "too much text", "poor contrast", "clean layout", "modern design"
]



@app.route('/test-connection')
def test_connection():
    try:
        # Test auth
        auth_response = supabase.auth.get_user()
        # Test storage
        storage_response = supabase.storage.from_('images').list()
        return jsonify({
            "auth": "working" if not auth_response.error else "failed",
            "storage": "working" if not storage_response.error else "failed"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/verify-supabase', methods=['GET'])
def verify_supabase():
    try:
        # Test storage access
        storage_test = supabase.storage.from_('images').list()
        if storage_test.error:
            return jsonify({"storage": "failed", "error": storage_test.error.message}), 500
        
        # Test database access
        db_test = supabase.table('analyses').select("*").limit(1).execute()
        if hasattr(db_test, 'error') and db_test.error:
            return jsonify({"database": "failed", "error": db_test.error.message}), 500
        
        return jsonify({
            "storage": "working",
            "database": "working",
            "table_exists": len(db_test.data) >= 0
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/verify-storage', methods=['GET'])
def verify_storage():
    try:
        # Test if bucket exists
        response = supabase.storage.from_('images').list()
        if response.error:
            return jsonify({"error": "'images' bucket not found"}), 404
        
        # Test small upload/download
        test_data = b'test'
        path = 'test.txt'
        upload_response = supabase.storage.from_('images').upload(path, test_data)
        if upload_response.error:
            return jsonify({"error": f"Upload failed: {upload_response.error.message}"}), 500
            
        downloaded = supabase.storage.from_('images').download(path)
        if downloaded != test_data:
            return jsonify({"error": "upload/download mismatch"}), 500
            
        # Clean up
        supabase.storage.from_('images').remove([path])
        return jsonify({"status": "working"})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


    

@app.route('/analyze', methods=['POST'])
def analyze_image():
    try:
        data = request.json
        image_url = data.get('image_url')
        user_id = data.get('user_id')
        
        if not image_url or not user_id:
            return jsonify({"error": "Missing required parameters"}), 400

        # Download image from Supabase storage - updated handling
        try:
            image_bytes = supabase.storage.from_('images').download(image_url)
            if not image_bytes:
                return jsonify({"error": "Failed to download image (empty response)"}), 400
        except Exception as download_error:
            return jsonify({"error": f"Download failed: {str(download_error)}"}), 400

        # Process image with CLIP
        try:
            image = Image.open(io.BytesIO(image_bytes))
            image_input = preprocess(image).unsqueeze(0).to(device)
            text_inputs = torch.cat([clip.tokenize(desc) for desc in ui_elements]).to(device)

            with torch.no_grad():
                image_features = model.encode_image(image_input)
                text_features = model.encode_text(text_inputs)
                logits_per_image, _ = model(image_input, text_inputs)
                probs = logits_per_image.softmax(dim=-1).cpu().numpy()

            # Get top elements
            top_probs = np.argsort(probs[0])[::-1]
            top_elements = [ui_elements[idx] for idx in top_probs[:5]]
            description = ", ".join(top_elements)
        except Exception as processing_error:
            return jsonify({"error": f"Image processing failed: {str(processing_error)}"}), 400

        # Get critique from OpenRouter
        prompt = f"""
        You are a design critique assistant. Analyze this UI containing: {description}.
        Provide specific recommendations addressing:
        1. Visual hierarchy improvements
        2. Usability enhancements
        3. Color and contrast adjustments
        4. Layout optimization
        5. Mobile responsiveness considerations
        
        Be constructive and provide actionable suggestions.
        """
        
        headers = {
            "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "UI Analyzer"
        }

        payload = {
            "model": "deepseek/deepseek-chat-v3-0324:free",
            "messages": [
                {"role": "system", "content": "You are a professional UI/UX designer providing detailed, actionable feedback."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 800
        }

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions", 
            headers=headers, 
            json=payload,
            timeout=30  # Add timeout
        )

        if response.status_code == 200:
            critique = response.json()['choices'][0]['message']['content']
        else:
            critique = f"Analysis partially completed. Could not get full critique: {response.text}"

         # Store results in database
        analysis_id = str(uuid.uuid4())
        try:
            insert_response = supabase.table('analyses').insert({
                "id": analysis_id,
                "user_id": user_id,
                "image_url": image_url,
                "results": {
                    "elements": top_elements,
                    "critique": critique,
                    "scores": {ui_elements[i]: float(probs[0][i]) for i in top_probs[:5]}
                }
            }).execute()

            # Check for errors in insert operation
            if hasattr(insert_response, 'error') and insert_response.error:
                raise Exception(f"Database error: {insert_response.error.message}")
            elif isinstance(insert_response, dict) and 'error' in insert_response:
                raise Exception(f"Database error: {insert_response['error']}")

            return jsonify({
                "status": "success",
                "analysis_id": analysis_id,
                "elements": top_elements,
                "critique": critique,
                "image_url": image_url
            })

        except Exception as db_error:
            return jsonify({
                "status": "partial_success",
                "analysis": {
                    "elements": top_elements,
                    "critique": critique
                },
                "message": f"Analysis completed but storage failed: {str(db_error)}"
            }), 207  # Using 207 for partial success

    except Exception as e:
        app.logger.error(f"Analysis failed: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)