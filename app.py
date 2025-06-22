from flask import Flask, request, jsonify
from flask_cors import CORS
import clip
import torch
from PIL import Image
import requests
import json
import os
import io
import numpy as np
from supabase import create_client, Client
import uuid
from dotenv import load_dotenv
from colorthief import ColorThief
import webcolors

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

def get_color_palette(image_bytes):
    """Extract color palette from image"""
    color_thief = ColorThief(io.BytesIO(image_bytes))
    palette = color_thief.get_palette(color_count=5)
    return [webcolors.rgb_to_hex(color) for color in palette]

def generate_structured_prompt(description, color_palette):
    return f"""
    Analyze this UI design and provide structured feedback in exactly this format:
    
    [OVERALL RATING]
    X/10 - Brief justification
    
    [COLOR CRITIQUE]
    - Analyze this color palette: {color_palette}
    - Evaluate color harmony, contrast, and accessibility
    - Suggest specific improvements if needed
    
    [OTHER FEEDBACK]
    - Address these UI characteristics: {description}
    - Focus on layout, hierarchy, and usability
    - Provide actionable suggestions
    
    Do not include:
    - Any additional commentary outside the sections
    - Questions or prompts to the user
    - Markdown formatting like ** or #
    - Examples or disclaimers
    """

def parse_critique_response(raw_critique):
    """Parse the structured response into sections"""
    critique_parts = {
        'overall_rating': '',
        'color_critique': '',
        'other_feedback': ''
    }
    
    current_section = None
    for line in raw_critique.split('\n'):
        line = line.strip()
        if line.startswith('[OVERALL RATING]'):
            current_section = 'overall_rating'
        elif line.startswith('[COLOR CRITIQUE]'):
            current_section = 'color_critique'
        elif line.startswith('[OTHER FEEDBACK]'):
            current_section = 'other_feedback'
        elif current_section and line and not line.startswith('['):
            # Clean line from any remaining markdown
            clean_line = line.replace('**', '').replace('#', '').strip()
            if clean_line:
                critique_parts[current_section] += clean_line + '\n'
    
    # Clean up each section
    for key in critique_parts:
        critique_parts[key] = critique_parts[key].strip()
    
    return critique_parts

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

@app.route('/analyze', methods=['POST'])
def analyze_image():
    try:
        data = request.json
        image_url = data.get('image_url')
        user_id = data.get('user_id')
        
        if not image_url or not user_id:
            return jsonify({"error": "Missing required parameters"}), 400

        # Download image from Supabase storage
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
            
            # Get color palette
            color_palette = get_color_palette(image_bytes)
            
        except Exception as processing_error:
            return jsonify({"error": f"Image processing failed: {str(processing_error)}"}), 400

        # Get critique from OpenRouter
        prompt = generate_structured_prompt(description, color_palette)
        
        headers = {
            "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "UI Analyzer"
        }

        payload = {
            "model": "deepseek/deepseek-chat-v3-0324:free",
            "messages": [
                {"role": "system", "content": "You are a professional UI/UX designer providing structured feedback."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 800
        }

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions", 
            headers=headers, 
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            raw_critique = response.json()['choices'][0]['message']['content']
            critique_parts = parse_critique_response(raw_critique)
            
            # Store results in database
            analysis_id = str(uuid.uuid4())
            insert_response = supabase.table('analyses').insert({
                "id": analysis_id,
                "user_id": user_id,
                "image_url": image_url,
                "results": {
                    "color_palette": color_palette,
                    "overall_rating": critique_parts['overall_rating'],
                    "color_critique": critique_parts['color_critique'],
                    "other_feedback": critique_parts['other_feedback'],
                    "elements": top_elements
                }
            }).execute()

            if hasattr(insert_response, 'error') and insert_response.error:
                raise Exception(f"Database error: {insert_response.error.message}")

            return jsonify({
                "status": "success",
                "analysis_id": analysis_id,
                "color_palette": color_palette,
                "overall_rating": critique_parts['overall_rating'],
                "color_critique": critique_parts['color_critique'],
                "other_feedback": critique_parts['other_feedback'],
                "image_url": image_url
            })

        else:
            error_msg = f"OpenRouter API error: {response.status_code} - {response.text}"
            return jsonify({
                "status": "error",
                "message": error_msg
            }), 500

    except Exception as e:
        app.logger.error(f"Analysis failed: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)