# 🎧 EchoPulse
**AI-Powered Sound-to-Haptic Alert System for Deaf Users**

Built by **Team Shotgun API** | 30-Hour Hackathon Project

---

## 💡 The Problem

466 million deaf people worldwide miss critical safety alerts: fire alarms, car horns, doorbells, and baby crying. Current solutions cost $500+ and only work in one room.

---

## ✨ Our Solution

EchoPulse turns any smartphone into an intelligent safety system using AI to detect emergency sounds and convert them into customized haptic vibrations.

---

## 🎯 Key Features

- ✅ **Real-time AI Detection** - MIT Audio Transformer classifies 527 sounds → 7 critical alerts
- ✅ **AI Confidence Scores** - Shows ML certainty (e.g., 94.3%)
- ✅ **Custom Vibration Patterns** - 4 patterns (Strong Single, Triple Pulse, Rapid Fire, Escalating)
- ✅ **User Customization** - Choose vibration pattern per sound type
- ✅ **Smart Cooldown** - Prevents alert spam (10-second cooldown)
- ✅ **Daily Statistics** - Track detections and most common sounds
- ✅ **Background Noise Filtering** - Ignores safe sounds automatically
- ✅ **100% Free** - Core safety features free forever

---

## 🛠 Tech Stack

**Frontend:** React Native (Expo), expo-av, Animated API  
**Backend:** Flask, Transformers (Hugging Face), FFmpeg, pydub  
**AI Model:** MIT/ast-finetuned-audioset-10-10-0.4593 (2M+ training samples)

---

## 🚀 Quick Start

### Backend Setup

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Install FFmpeg
# macOS: brew install ffmpeg
# Windows: Download from ffmpeg.org
# Linux: sudo apt-get install ffmpeg

# Run server
python realtime_detector.py

# Expose with ngrok (for mobile testing)
ngrok http 5000
```

URL: https://trekker-unleaded-overspend.ngrok-free.dev/predict

### Frontend Setup

```bash
# Install dependencies
cd frontend
npm install

# Update backend URL in App.js
const BACKEND_URL = "https://trekker-unleaded-overspend.ngrok-free.dev/predict";

# Start app
npx expo start
```

Scan QR code with Expo Go app on your phone.

---

## 📡 API Endpoint

**POST /predict**

Request:
```bash
curl -X POST http://localhost:5000/predict -F "audio=@recording.m4a"
```

Response:
```json
{
  "label": "Car horn, honking",
  "confidence": 94.3
}
```


## 🔧 Architecture

---


## 📊 Impact

**Market:** 466M deaf users worldwide | $500M+ TAM  
**Advantage:** Portable, free, AI-powered vs fixed $500+ systems

**Business Model:**
- Free: Core safety features
- Premium ($2.99/mo): Custom training, emergency SMS, smart home
- Enterprise: Hotels, hospitals, schools

---

## 🔮 Roadmap

- Month 1-2: Beta testing, Android release
- Month 3-4: Emergency SMS, smart home integration
- Month 5-6: App Store launch, enterprise pilots

---

## 🎓 Technical Challenges Solved

- **iOS Background Limits** → 3-second active monitoring cycles
- **527 Noisy Classes** → Custom mapping to 7 critical alerts
- **M4A Incompatibility** → FFmpeg preprocessing pipeline
- **API Latency** → Async processing + simulation fallback

---

## 📄 Files

**Backend:**
- `realtime_detector.py` - Main server (production)
- `server.py` - Simplified version (reference)
- `requirements.txt` - Python dependencies

**Frontend:**
- `App.js` - Main React Native app
- `package.json` - Node dependencies

---

*"Accessibility isn't a feature. It's a right."*
