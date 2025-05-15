from flask import Flask, request, render_template, jsonify
import clip
import torch
from PIL import Image
import requests
import json
import os

app = Flask(__name__)

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

API_KEY = "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" 

ui_elements = [
    "login form", "search bar", "navigation menu", "colorful buttons",
    "footer links", "large header text", "minimalist design",
    "too much text", "poor contrast", "clean layout", "modern design"
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['image']
    image_path = os.path.join('static', 'uploaded_image.png')
    file.save(image_path)

    image = Image.open(image_path)
    image_input = preprocess(image).unsqueeze(0).to(device)
    text_inputs = torch.cat([clip.tokenize(desc) for desc in ui_elements]).to(device)

    with torch.no_grad():
        image_features = model.encode_image(image_input)
        text_features = model.encode_text(text_inputs)
        logits_per_image, _ = model(image_input, text_inputs)
        probs = logits_per_image.softmax(dim=-1).cpu().numpy()

    import numpy as np
    top_probs = np.argsort(probs[0])[::-1]
    top_elements = [ui_elements[idx] for idx in top_probs[:5]]
    description = ", ".join(top_elements)

    # OpenRouter API call
    prompt = f"""
    You are a design critique assistant. Based on this UI description: "{description}", analyze the user interface and suggest specific improvements. Focus on visual hierarchy, usability, color balance, and readability.
    """
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "deepseek/deepseek-chat-v3-0324:free",
        "messages": [
            {"role": "system", "content": "You are a helpful UI/UX design critic."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 500
    }

    response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, data=json.dumps(payload))

    if response.status_code == 200:
        result = response.json()
        critique = result['choices'][0]['message']['content']
    else:
        critique = "API Error: " + response.text

    return jsonify({
        "elements": top_elements,
        "critique": critique
    })

if __name__ == '__main__':
    app.run(debug=True)
