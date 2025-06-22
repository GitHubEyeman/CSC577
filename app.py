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

# Enhanced UI elements with weights and categories
ui_elements = {
    "positive": [
        {"element": "intuitive navigation", "weight": 0.9},
        {"element": "effective search functionality", "weight": 0.8},
        {"element": "clean visual hierarchy", "weight": 0.85},
        {"element": "responsive design", "weight": 0.7},
        {"element": "consistent styling", "weight": 0.75},
        {"element": "good contrast", "weight": 0.8}
    ],
    "negative": [
        {"element": "cluttered interface", "weight": -0.8},
        {"element": "poor information architecture", "weight": -0.75},
        {"element": "inconsistent styling", "weight": -0.6},
        {"element": "lack of visual hierarchy", "weight": -0.7},
        {"element": "too much text", "weight": -0.65},
        {"element": "poor contrast", "weight": -0.8}
    ]
}

def calculate_ui_score(detected_elements):
    """Calculate a score based on detected elements and their weights"""
    score = 5.0  # Neutral starting point
    
    # Check positive elements
    for element in ui_elements["positive"]:
        if element["element"] in detected_elements:
            score += element["weight"]
    
    # Check negative elements
    for element in ui_elements["negative"]:
        if element["element"] in detected_elements:
            score += element["weight"]
    
    # Ensure score stays within 0-10 range
    return min(10, max(0, round(score, 1)))

def get_rating_description(score):
    """Get descriptive text based on score"""
    if score >= 9: return "Excellent UI design"
    elif score >= 7: return "Good design with minor improvements needed"
    elif score >= 5: return "Average design needing several improvements"
    else: return "Poor design needing significant work"

def generate_structured_prompt(detected_elements, color_palette, ui_score):
    """Generate a well-structured prompt for the AI critique"""
    # Categorize detected elements
    positive_elements = [e for e in detected_elements 
                       if any(e == item["element"] for item in ui_elements["positive"])]
    negative_elements = [e for e in detected_elements 
                       if any(e == item["element"] for item in ui_elements["negative"])]
    
    prompt = f"""
    Analyze this UI design with the following characteristics:
    
    [DETECTED FEATURES]
    Overall Score: {ui_score}/10 - {get_rating_description(ui_score)}
    
    Strengths:
    {', '.join(positive_elements) if positive_elements else 'None identified'}
    
    Weaknesses:
    {', '.join(negative_elements) if negative_elements else 'None identified'}
    
    Color Palette: {', '.join(color_palette)}
    
    [REQUIRED RESPONSE FORMAT]
    [OVERALL RATING]
    X/10 - Brief justification that considers the detected features
    
    [COLOR CRITIQUE]
    - Analyze this color palette
    - Evaluate harmony, contrast, and accessibility
    - Suggest improvements if needed
    
    [OTHER FEEDBACK]
    - Address the detected features specifically
    - Focus on layout, hierarchy, and usability
    - Provide actionable suggestions
    
    Important:
    - Maintain this exact section structure
    - Don't include markdown formatting
    - Be concise and professional
    """
    return prompt

def get_color_palette(image_bytes):
    """Extract color palette from image"""
    color_thief = ColorThief(io.BytesIO(image_bytes))
    palette = color_thief.get_palette(color_count=5)
    return [webcolors.rgb_to_hex(color) for color in palette]

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
            clean_line = line.replace('**', '').replace('#', '').strip()
            if clean_line:
                critique_parts[current_section] += clean_line + '\n'
    
    # Clean up each section
    for key in critique_parts:
        critique_parts[key] = critique_parts[key].strip()
    
    return critique_parts

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
                return jsonify({"error": "Failed to download image"}), 400
        except Exception as e:
            return jsonify({"error": f"Download failed: {str(e)}"}), 400

        # Process image with CLIP
        try:
            image = Image.open(io.BytesIO(image_bytes))
            image_input = preprocess(image).unsqueeze(0).to(device)
            
            # Prepare all element texts for CLIP
            all_elements = [item["element"] for item in ui_elements["positive"]] + \
                          [item["element"] for item in ui_elements["negative"]]
            text_inputs = torch.cat([clip.tokenize(desc) for desc in all_elements]).to(device)

            with torch.no_grad():
                logits_per_image, _ = model(image_input, text_inputs)
                probs = logits_per_image.softmax(dim=-1).cpu().numpy()

            # Get top 5 elements
            top_probs = np.argsort(probs[0])[::-1]
            top_elements = [all_elements[idx] for idx in top_probs[:5]]
            
            # Calculate UI score
            ui_score = calculate_ui_score(top_elements)
            
            # Get color palette
            color_palette = get_color_palette(image_bytes)
            
        except Exception as e:
            return jsonify({"error": f"Image processing failed: {str(e)}"}), 400

        # Get critique from OpenRouter
        prompt = generate_structured_prompt(top_elements, color_palette, ui_score)
        
        headers = {
            "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
            "Content-Type": "application/json"
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
                    "elements": top_elements,
                    "ui_score": ui_score,
                    "color_palette": color_palette,
                    "overall_rating": critique_parts['overall_rating'],
                    "color_critique": critique_parts['color_critique'],
                    "other_feedback": critique_parts['other_feedback']
                }
            }).execute()

            if hasattr(insert_response, 'error') and insert_response.error:
                raise Exception(f"Database error: {insert_response.error.message}")

            return jsonify({
                "status": "success",
                "analysis_id": analysis_id,
                "elements": top_elements,
                "ui_score": ui_score,
                "color_palette": color_palette,
                "overall_rating": critique_parts['overall_rating'],
                "color_critique": critique_parts['color_critique'],
                "other_feedback": critique_parts['other_feedback']
            })

        else:
            return jsonify({
                "status": "error",
                "message": f"OpenRouter error: {response.status_code} - {response.text}"
            }), 500

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)