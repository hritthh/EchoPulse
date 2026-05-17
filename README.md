# 🎧 EchoPulse
**Sound-to-Haptic Alert System for Deaf Users**

Built by **Team Shotgun API** for [Hackathon Name]

---

## 🚀 Quick Demo
[Link to demo video or live deployment]

---

## 💡 The Problem
466 million deaf people worldwide miss critical safety alerts:
- Fire alarms
- Car horns  
- Doorbells
- Baby crying

Current solutions cost $500+ and only work in one room.

---

## ✨ Our Solution
EchoPulse turns any smartphone into an intelligent safety system using AI to detect emergency sounds and convert them into haptic vibrations.

---

## 🎯 Key Features
- ✅ Real-time AI sound detection (MIT AST model)
- ✅ 7 critical sound categories
- ✅ Custom vibration patterns
- ✅ AI confidence scores
- ✅ Smart cooldown (no spam)
- ✅ Daily statistics tracking
- ✅ 100% free

---

## 🛠 Tech Stack

**Frontend:**
- React Native (Expo)
- expo-av for audio recording
- Animated API for UX

**Backend:**
- Flask (Python)
- Transformers (Hugging Face)
- MIT/ast-finetuned-audioset-10-10-0.4593
- FFmpeg for audio preprocessing
- Deployed on Railway

**AI Model:**
- Pre-trained on 2M+ audio samples
- 527 sound classes → 7 critical alerts
- 85-95% accuracy

---

## 📱 Installation

### Frontend (Mobile App)
```bash
cd frontend
npm install
npx expo start
```

### Backend (API)
```bash
cd backend
pip install -r requirements.txt
python app.py
```

**Backend URL:** [Your Railway URL]

---

## 🎬 Demo Instructions
1. Press START
2. Play a car horn sound (YouTube)
3. Watch detection with confidence score
4. Check Settings for customization

---

## 👥 Team
- Person 1: [Role]
- Person 2: Backend Lead
- Person 3: Mobile Lead (You!)
- Person 4: Integration
- Person 5: Demo/Presentation

---

## 🏆 Hackathon Submission
- **Category:** Accessibility / Social Impact
- **Duration:** 30 hours
- **Status:** ✅ Fully functional

---

## 📊 Impact
- **Market:** 466M deaf users worldwide
- **TAM:** $500M+
- **Advantage:** Portable, free, AI-powered

---

## 🔮 Future Roadmap
- Emergency contact SMS alerts
- Smart home integration
- Custom sound training
- App store launch

---

## 📄 License
MIT License

---

## 🙏 Acknowledgments
- MIT for the Audio Spectrogram Transformer model
- Hugging Face for ML infrastructure
- Railway for deployment

---

**Built with ❤️ for accessibility**
