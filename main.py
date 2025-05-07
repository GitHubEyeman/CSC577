from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
import clip
import io
import requests

app = FastAPI()

# Allow frontend access (adjust if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ← Replace with your frontend URL for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# List of UI descriptors
ui_descriptors = [
    "login form", "navigation menu", "colorful buttons", "large header",
    "search bar", "minimalist design", "too much text", "poor contrast",
    "footer links", "responsive layout", "modern design"
]

OPENROUTER_API_KEY = "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"

@app.post("/analyze-ui")
async def analyze_ui(image: UploadFile = File(...)):
    image_data = await image.read()
    img = Image.open(io.BytesIO(image_data)).convert("RGB")
    image_input = preprocess(img).unsqueeze(0).to(device)
    text_inputs = torch.cat([clip.tokenize(desc) for desc in ui_descriptors]).to(device)

    with torch.no_grad():
        image_features, text_features = model(image_input, text_inputs)
        logits_per_image = (image_features @ text_features.T)
        probs = logits_per_image.softmax(dim=-1).cpu().numpy()[0]

    top_matches = sorted(zip(probs, ui_descriptors), reverse=True)[:5]
    description = ", ".join([desc for _, desc in top_matches])

    prompt = f"""
    A user uploaded a UI design screenshot. The CLIP model identified the following elements: "{description}". 
    Based on this, provide a helpful UI/UX critique and offer specific improvement suggestions.
    """

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "deepseek/deepseek-chat-v3-0324:free",
        "messages": [
            {"role": "system", "content": "You are a UI/UX design critique assistant."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 500
    }

    res = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
    ai_response = res.json()["choices"][0]["message"]["content"]

    return {"description": description, "critique": ai_response}
