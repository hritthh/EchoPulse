from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
import warnings

# Suppress annoying background warnings
warnings.filterwarnings("ignore")

# Initialize the web server
app = Flask(__name__)
CORS(app) # This tells the server to accept requests from the mobile app

print("[*] Loading the AI Brain... Please wait.")
audio_classifier = pipeline("audio-classification", model="MIT/ast-finetuned-audioset-10-10-0.4593")
print("[+] Brain loaded! Server is starting...")

# This creates an "endpoint" at /predict
@app.route("/predict", methods=["POST"])
def predict():
    # 1. Check if the app actually sent a file named "audio"
    if "audio" not in request.files:
        print("[-] Error: App didn't send an audio file.")
        return jsonify({"error": "No audio file sent"}), 400

    audio_file = request.files["audio"]
    audio_bytes = audio_file.read() # Read the raw audio data
    
    print("[~] Received audio from the mobile app! Processing...")

    try:
        # 2. Feed the raw audio data directly to the Hugging Face model
        result = audio_classifier(audio_bytes)
        
        # 3. Format the results
        top_guess = result[0]['label']
        confidence = result[0]['score'] * 100
        
        print(f"[!] Sent back to app: {top_guess.upper()} ({confidence:.1f}%)")
        print("-" * 40)
        
        # 4. Reply to the app with the answer in JSON format
        return jsonify({
            "label": top_guess,
            "confidence": confidence
        })
        
    except Exception as e:
        print(f"[-] AI Error: {e}")
        return jsonify({"error": "Failed to process audio"}), 500

if __name__ == "__main__":
    # Start the server on port 5000
    app.run(host="0.0.0.0", port=5000)