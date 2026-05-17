from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
import numpy as np
import io
import warnings
from pydub import AudioSegment

# Suppress annoying background warnings
warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app) 

print("[*] Loading the AI Brain... Please wait.")
audio_classifier = pipeline("audio-classification", model="MIT/ast-finetuned-audioset-10-10-0.4593")
print("[+] Brain loaded! Server is starting...")

@app.route("/predict", methods=["POST"])
def predict():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file sent"}), 400

    try:
        audio_file = request.files["audio"]
        audio_bytes = audio_file.read() 
        print("[~] Received audio! Decoding with system FFmpeg...")

        # System FFmpeg handles M4A, MP4, WAV seamlessly
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        audio = audio.set_channels(1).set_frame_rate(16000)
        
        samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
        samples = samples / 32768.0  

        result = audio_classifier({"raw": samples, "sampling_rate": 16000})
        
        top_guess = result[0]['label']
        confidence = result[0]['score'] * 100
        
        print(f"[!] Sent back to app: {top_guess.upper()} ({confidence:.1f}%)")
        print("-" * 40)
        
        return jsonify({
            "label": top_guess,
            "confidence": confidence
        })
        
    except Exception as e:
        print(f"[-] AI Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)