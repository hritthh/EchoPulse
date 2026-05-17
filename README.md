## 🚀 Quick Start

### Backend (Local Server)

1. **Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Install FFmpeg:**
   - macOS: `brew install ffmpeg`
   - Windows: Download from ffmpeg.org
   - Linux: `sudo apt-get install ffmpeg`

3. **Start server:**
```bash
python realtime_detector.py
```

4. **Expose with ngrok:**
```bash
ngrok http 5000
```

5. **Copy ngrok URL** and update `BACKEND_URL` in `frontend/App.js`

### Frontend (Mobile App)

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Update backend URL** in `App.js`:
```javascript
const BACKEND_URL = "https://YOUR-NGROK-URL.ngrok-free.app/predict";
```

3. **Start Expo:**
```bash
npx expo start
```

4. **Scan QR code** with Expo Go app on your phone

---

## 🔧 Architecture

```
Mobile App (React Native)
    ↓ Records 3-second audio clip
    ↓ HTTP POST to backend
Flask Server (Local + ngrok)
    ↓ FFmpeg preprocessing
    ↓ Audio → 16kHz mono
MIT Audio Transformer
    ↓ Classification
    ↓ Returns label + confidence
Mobile App
    ↓ Maps label to sound type
    ↓ Triggers vibration + flash
User Gets Alert! 🎉
```
