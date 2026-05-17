import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Vibration, SafeAreaView, ScrollView, Animated, Switch, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [lastDetected, setLastDetected] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [debugCounter, setDebugCounter] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showVibrationEditor, setShowVibrationEditor] = useState(false);
  const [editingSound, setEditingSound] = useState(null);
  const [useRealAI, setUseRealAI] = useState(true);
  
  const BACKEND_URL = "https://trekker-unleaded-overspend.ngrok-free.dev/predict";
  
  const [enabledSounds, setEnabledSounds] = useState({
    car_horn: true,
    siren: true,
    doorbell: true,
    glass_breaking: true,
    alarm: true,
    baby_crying: true,
    dog_barking: true,
  });
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(true);
  
  const [customVibrations, setCustomVibrations] = useState({
    car_horn: 'strong_single',
    siren: 'triple_pulse',
    doorbell: 'escalating',
    glass_breaking: 'rapid_fire',
    alarm: 'triple_pulse',
    baby_crying: 'escalating',
    dog_barking: 'rapid_fire',
  });
  
  // ✅ NEW: STATS TRACKING
  const [todayStats, setTodayStats] = useState({
    total: 0,
    bySound: {
      car_horn: 0,
      siren: 0,
      doorbell: 0,
      glass_breaking: 0,
      alarm: 0,
      baby_crying: 0,
      dog_barking: 0,
    },
    date: new Date().toDateString(),
  });
  
  // ✅ NEW: COOLDOWN TRACKING
  const lastDetectionTime = useRef({});
  const COOLDOWN_MS = 10000; // 10 seconds
  
  const intervalRef = useRef(null);
  const isProcessingRef = useRef(false);
  
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const flashColor = useRef('#FFFFFF');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.8)).current;

  const SOUND_PATTERNS = {
    car_horn: { name: 'Car Horn', icon: '🚗', color: '#E74C3C' },
    siren: { name: 'Siren', icon: '🚨', color: '#C0392B' },
    doorbell: { name: 'Doorbell', icon: '🔔', color: '#3498DB' },
    glass_breaking: { name: 'Glass Breaking', icon: '💥', color: '#E67E22' },
    alarm: { name: 'Alarm', icon: '⏰', color: '#F39C12' },
    baby_crying: { name: 'Baby Crying', icon: '👶', color: '#9B59B6' },
    dog_barking: { name: 'Dog Barking', icon: '🐕', color: '#16A085' }
  };

  const VIBRATION_PATTERNS = {
    strong_single: {
      name: '💪 Very Strong Single',
      description: 'One powerful 2-second pulse',
      pattern: [0, 2000]
    },
    triple_pulse: {
      name: '🔁 Triple Pulse',
      description: '1s → 0.5s pause → repeat 3 times',
      pattern: [0, 1000, 500, 1000, 500, 1000]
    },
    rapid_fire: {
      name: '⚡ Rapid Fire',
      description: 'Quick repeating pulses',
      pattern: [0, 500, 200, 500, 200, 500, 200, 500]
    },
    escalating: {
      name: '📈 Escalating',
      description: 'Gets stronger with each pulse',
      pattern: [0, 300, 100, 600, 100, 900]
    }
  };

  // ✅ RESET STATS AT MIDNIGHT
  useEffect(() => {
    const checkDate = setInterval(() => {
      const currentDate = new Date().toDateString();
      if (todayStats.date !== currentDate) {
        setTodayStats({
          total: 0,
          bySound: {
            car_horn: 0,
            siren: 0,
            doorbell: 0,
            glass_breaking: 0,
            alarm: 0,
            baby_crying: 0,
            dog_barking: 0,
          },
          date: currentDate,
        });
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkDate);
  }, [todayStats.date]);

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access for AI detection');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Permission error:', err);
      return false;
    }
  };

  const recordAudioClip = async (duration = 3000) => {
    let recording = null;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recording = newRecording;
      await new Promise(resolve => setTimeout(resolve, duration));
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      return uri;
      
    } catch (err) {
      console.error('Recording error:', err);
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {}
      }
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch (e) {}
      return null;
    }
  };

  // ✅ UPDATED: RETURNS CONFIDENCE SCORE
  const classifyAudio = async (audioUri) => {
    try {
      console.log('Sending audio to backend...');
      
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Backend response:', result);
      
      if (result.label) {
        const label = result.label.toLowerCase();
        const confidence = result.confidence || 0;
        console.log('AI detected:', label, `(${confidence.toFixed(1)}%)`);
        
        let soundType = null;
        
        if (label.includes('car horn') || label.includes('honking')) {
          soundType = 'car_horn';
        } else if (label.includes('siren')) {
          soundType = 'siren';
        } else if (label.includes('doorbell') || label.includes('door bell')) {
          soundType = 'doorbell';
        } else if (label.includes('glass') || (label.includes('breaking') || label.includes('shatter'))) {
          soundType = 'glass_breaking';
        } else if (label.includes('alarm') || label.includes('smoke detector') || label.includes('fire alarm')) {
          soundType = 'alarm';
        } else if (label.includes('baby') || label.includes('infant') || (label.includes('child') && label.includes('cry'))) {
          soundType = 'baby_crying';
        } else if (label.includes('dog') || label.includes('bark') || label.includes('animal') || label.includes('woof')) {
          soundType = 'dog_barking';
        }
        
        console.log('Mapped to:', soundType || 'IGNORED (safe background noise)');
        return { soundType, confidence };
      }
      
      return { soundType: null, confidence: 0 };
      
    } catch (err) {
      console.error('API call failed:', err);
      return { soundType: 'ERROR', confidence: 0 };
    }
  };

  const simulateDetection = () => {
    const sounds = Object.keys(SOUND_PATTERNS).filter(sound => enabledSounds[sound]);
    if (sounds.length === 0) return { soundType: null, confidence: 0 };
    if (Math.random() < 0.8) {
      return { 
        soundType: sounds[Math.floor(Math.random() * sounds.length)],
        confidence: 75 + Math.random() * 25 // 75-100%
      };
    }
    return { soundType: null, confidence: 0 };
  };

  const triggerVibration = (soundType) => {
    if (!vibrationEnabled) return;
    
    const patternKey = customVibrations[soundType] || 'strong_single';
    const pattern = VIBRATION_PATTERNS[patternKey];
    
    if (pattern) {
      Vibration.vibrate(pattern.pattern);
    } else {
      Vibration.vibrate(1000);
    }
  };

  // ✅ NEW: HAPTIC FEEDBACK HELPER
  const hapticFeedback = (type = 'light') => {
    if (type === 'light') {
      Vibration.vibrate(10);
    } else if (type === 'medium') {
      Vibration.vibrate(20);
    } else if (type === 'heavy') {
      Vibration.vibrate(50);
    }
  };

  const triggerFlash = (color) => {
    if (!flashEnabled) return;
    flashColor.current = color;
    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateCard = () => {
    cardScaleAnim.setValue(0.8);
    Animated.spring(cardScaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // ✅ UPDATED: CHECK COOLDOWN + TRACK STATS + SHOW CONFIDENCE
  const handleSoundDetected = (soundType, confidence) => {
    if (!soundType || !enabledSounds[soundType]) return;
    
    const pattern = SOUND_PATTERNS[soundType];
    if (!pattern) return;

    // ✅ CHECK COOLDOWN
    const now = Date.now();
    const lastTime = lastDetectionTime.current[soundType] || 0;
    
    if (now - lastTime < COOLDOWN_MS) {
      console.log(`Cooldown active for ${soundType}, skipping...`);
      return;
    }
    
    lastDetectionTime.current[soundType] = now;

    const timestamp = new Date().toLocaleTimeString();
    
    // ✅ UPDATE STATS
    setTodayStats(prev => ({
      ...prev,
      total: prev.total + 1,
      bySound: {
        ...prev.bySound,
        [soundType]: prev.bySound[soundType] + 1
      }
    }));
    
    setLastDetected({ soundType, pattern, timestamp, confidence });
    triggerVibration(soundType);
    triggerFlash(pattern.color);
    animateCard();
    
    setDetectionHistory(prev => [
      { soundType, pattern, timestamp, confidence },
      ...prev.slice(0, 9)
    ]);
  };

  const runDetection = async () => {
    if (isProcessingRef.current) {
      console.log('Still processing, skipping...');
      return;
    }
    
    isProcessingRef.current = true;
    setDebugCounter(prev => prev + 1);
    
    let result = { soundType: null, confidence: 0 };

    if (useRealAI) {
      try {
        console.log('Recording audio...');
        const audioUri = await recordAudioClip(3000);
        
        if (audioUri) {
          console.log('Sending to AI...');
          result = await classifyAudio(audioUri);
        }
        
        if (result.soundType === 'ERROR') {
          console.log('API ERROR, using simulation as fallback');
          result = simulateDetection();
        } else if (result.soundType === null) {
          console.log('AI heard safe background noise - ignoring');
        }
        
      } catch (err) {
        console.error('Detection error:', err);
        result = simulateDetection();
      }
    } else {
      result = simulateDetection();
    }

    if (result.soundType && result.soundType !== 'ERROR') {
      handleSoundDetected(result.soundType, result.confidence);
    }
    
    isProcessingRef.current = false;
  };

  useEffect(() => {
    if (isListening) {
      runDetection();
      intervalRef.current = setInterval(() => {
        runDetection();
      }, 4000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isProcessingRef.current = false;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      isProcessingRef.current = false;
    };
  }, [isListening, enabledSounds, useRealAI]);

  const toggleListening = async () => {
    hapticFeedback('medium'); // ✅ HAPTIC FEEDBACK
    
    if (!isListening) {
      if (useRealAI) {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
          Alert.alert(
            'No Microphone Permission',
            'Switching to simulation mode',
            [{ text: 'OK', onPress: () => setUseRealAI(false) }]
          );
          return;
        }
      }
      
      setIsListening(true);
      setDetectionHistory([]);
      setLastDetected(null);
      setDebugCounter(0);
    } else {
      setIsListening(false);
    }
  };

  const toggleSound = (soundKey) => {
    hapticFeedback('light'); // ✅ HAPTIC FEEDBACK
    setEnabledSounds(prev => ({
      ...prev,
      [soundKey]: !prev[soundKey]
    }));
  };

  const selectPattern = (soundType, patternKey) => {
    setCustomVibrations(prev => ({
      ...prev,
      [soundType]: patternKey
    }));
    
    const pattern = VIBRATION_PATTERNS[patternKey];
    if (pattern) {
      Vibration.vibrate(pattern.pattern);
    }
    
    Alert.alert('Pattern Updated', `${SOUND_PATTERNS[soundType].name} will now use: ${pattern.name}`);
  };

  // ✅ GET MOST COMMON SOUND
  const getMostCommonSound = () => {
    const sounds = Object.entries(todayStats.bySound);
    if (sounds.length === 0) return null;
    
    const sorted = sounds.sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] === 0) return null;
    
    return {
      type: sorted[0][0],
      count: sorted[0][1],
      pattern: SOUND_PATTERNS[sorted[0][0]]
    };
  };

  // VIBRATION EDITOR SCREEN
  if (showVibrationEditor) {
    const currentPattern = SOUND_PATTERNS[editingSound];
    const selectedPatternKey = customVibrations[editingSound];
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => {
            hapticFeedback('light');
            setShowVibrationEditor(false);
          }}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Choose Pattern</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.settingsScroll}>
          <View style={styles.editorHeader}>
            <Text style={styles.editorIcon}>{currentPattern.icon}</Text>
            <Text style={styles.editorTitle}>{currentPattern.name}</Text>
            <Text style={styles.editorSubtitle}>Tap a pattern to select it</Text>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>AVAILABLE PATTERNS</Text>
            
            {Object.entries(VIBRATION_PATTERNS).map(([key, pattern]) => (
              <TouchableOpacity 
                key={key}
                style={[
                  styles.patternSelectButton,
                  selectedPatternKey === key && styles.patternSelectButtonActive
                ]}
                onPress={() => selectPattern(editingSound, key)}
              >
                <View style={styles.patternSelectContent}>
                  <View style={styles.patternSelectLeft}>
                    <Text style={[
                      styles.patternSelectLabel,
                      selectedPatternKey === key && styles.patternSelectLabelActive
                    ]}>
                      {pattern.name}
                    </Text>
                    <Text style={styles.patternSelectDesc}>{pattern.description}</Text>
                  </View>
                  {selectedPatternKey === key && (
                    <Text style={styles.patternSelectCheck}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.settingsSection}>
            <TouchableOpacity 
              style={styles.testButton}
              onPress={() => triggerVibration(editingSound)}
            >
              <Text style={styles.testButtonText}>📳 TEST CURRENT PATTERN</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.infoText}>
              💡 Tap any pattern above to assign it to {currentPattern.name}. The pattern will vibrate immediately so you can feel it!
            </Text>
          </View>
        </ScrollView>

        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  if (showSettings) {
    const mostCommon = getMostCommonSound();
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => {
            hapticFeedback('light');
            setShowSettings(false);
          }}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Settings</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.settingsScroll}>
          {/* ✅ TODAY'S STATS */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>TODAY'S STATS</Text>
            <View style={styles.statsBox}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Detections</Text>
                <Text style={styles.statValue}>{todayStats.total}</Text>
              </View>
              {mostCommon && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Most Common</Text>
                  <Text style={styles.statValue}>
                    {mostCommon.pattern.icon} {mostCommon.pattern.name} ({mostCommon.count})
                  </Text>
                </View>
              )}
              {todayStats.total === 0 && (
                <Text style={styles.noStatsText}>No detections yet today</Text>
              )}
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>DETECTION MODE</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>🤖 AI Detection</Text>
                <Text style={styles.settingDesc}>Use real AI (requires microphone)</Text>
              </View>
              <Switch
                value={useRealAI}
                onValueChange={(val) => {
                  hapticFeedback('light');
                  setUseRealAI(val);
                }}
                trackColor={{ false: '#BDC3C7', true: '#3498DB' }}
              />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>ALERTS</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Vibration Alerts</Text>
                <Text style={styles.settingDesc}>Vibrate when sound detected</Text>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={(val) => {
                  hapticFeedback('light');
                  setVibrationEnabled(val);
                }}
                trackColor={{ false: '#BDC3C7', true: '#27AE60' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Screen Flash</Text>
                <Text style={styles.settingDesc}>Flash screen with sound color</Text>
              </View>
              <Switch
                value={flashEnabled}
                onValueChange={(val) => {
                  hapticFeedback('light');
                  setFlashEnabled(val);
                }}
                trackColor={{ false: '#BDC3C7', true: '#27AE60' }}
              />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>DETECT THESE SOUNDS</Text>
            
            {Object.entries(SOUND_PATTERNS).map(([key, pattern]) => (
              <View key={key}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>
                      {pattern.icon} {pattern.name}
                    </Text>
                    <Text style={styles.settingDesc}>
                      {VIBRATION_PATTERNS[customVibrations[key]]?.name || 'Pattern'}
                    </Text>
                  </View>
                  <View style={styles.soundControls}>
                    <TouchableOpacity
                      style={styles.editVibrationButton}
                      onPress={() => {
                        hapticFeedback('light');
                        setEditingSound(key);
                        setShowVibrationEditor(true);
                      }}
                    >
                      <Text style={styles.editVibrationText}>📳</Text>
                    </TouchableOpacity>
                    <Switch
                      value={enabledSounds[key]}
                      onValueChange={() => toggleSound(key)}
                      trackColor={{ false: '#BDC3C7', true: pattern.color }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>ABOUT</Text>
            <View style={styles.aboutBox}>
              <Text style={styles.aboutTitle}>EchoPulse</Text>
              <Text style={styles.aboutText}>Sound-to-haptic alert system for deaf users</Text>
              <Text style={styles.aboutTeam}>by Shotgun API</Text>
              <Text style={styles.aboutMode}>
                {useRealAI ? '🤖 AI Mode Active' : '🎲 Simulation Mode'}
              </Text>
            </View>
          </View>
        </ScrollView>

        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.flashOverlay, 
          { 
            opacity: flashOpacity,
            backgroundColor: flashColor.current
          }
        ]} 
        pointerEvents="none"
      />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ width: 40 }} />
          <View style={styles.headerCenter}>
            <Text style={styles.title}>EchoPulse</Text>
            <Text style={styles.subtitle}>by Shotgun API</Text>
          </View>
          <TouchableOpacity 
            onPress={() => {
              hapticFeedback('light');
              setShowSettings(true);
            }} 
            style={styles.settingsButton}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.modeIndicator}>
        <Text style={styles.modeText}>
          {useRealAI ? '🤖 AI Mode' : '🎲 Simulation'}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <Animated.View 
          style={[
            styles.statusDot, 
            isListening && styles.statusActive,
            { transform: [{ scale: isListening ? pulseAnim : 1 }] }
          ]} 
        />
        <Text style={styles.statusText}>
          {isListening ? 'Listening...' : 'Not Listening'} [Loops: {debugCounter}]
        </Text>
      </View>

      <View style={styles.lastDetectionBox}>
        <Text style={styles.sectionLabel}>Last Detected:</Text>
        {lastDetected ? (
          <Animated.View 
            style={[
              styles.detectionCard, 
              { 
                backgroundColor: lastDetected.pattern.color,
                transform: [{ scale: cardScaleAnim }]
              }
            ]}
          >
            <Text style={styles.detectionIcon}>{lastDetected.pattern.icon}</Text>
            <View style={styles.detectionCardInfo}>
              <Text style={styles.detectionName}>{lastDetected.pattern.name}</Text>
              {/* ✅ SHOW CONFIDENCE */}
              <Text style={styles.detectionConfidence}>
                Confidence: {lastDetected.confidence.toFixed(1)}%
              </Text>
              <Text style={styles.detectionTime}>{lastDetected.timestamp}</Text>
            </View>
          </Animated.View>
        ) : (
          <Text style={styles.noDetection}>No sounds detected</Text>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.mainButton, isListening && styles.mainButtonActive]}
        onPress={toggleListening}
        activeOpacity={0.8}
      >
        <Text style={styles.mainButtonText}>
          {isListening ? 'STOP' : 'START'}
        </Text>
      </TouchableOpacity>

      <View style={styles.historyContainer}>
        <Text style={styles.sectionLabel}>Recent Detections:</Text>
        <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
          {detectionHistory.length === 0 ? (
            <Text style={styles.noHistory}>No history yet</Text>
          ) : (
            detectionHistory.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <Text style={styles.historyIcon}>{item.pattern.icon}</Text>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyName}>{item.pattern.name}</Text>
                  {/* ✅ SHOW CONFIDENCE IN HISTORY */}
                  <Text style={styles.historyConfidence}>{item.confidence.toFixed(1)}%</Text>
                  <Text style={styles.historyTime}>{item.timestamp}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  headerCenter: {
    alignItems: 'center',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2C3E50',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  modeIndicator: {
    alignSelf: 'center',
    backgroundColor: '#ECF0F1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  modeText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#BDC3C7',
    marginRight: 10,
  },
  statusActive: {
    backgroundColor: '#27AE60',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  statusText: {
    fontSize: 18,
    color: '#34495E',
    fontWeight: '500',
  },
  lastDetectionBox: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  detectionIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  detectionCardInfo: {
    flex: 1,
  },
  detectionName: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  detectionConfidence: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 3,
    fontWeight: '600',
  },
  detectionTime: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '400',
  },
  noDetection: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 30,
  },
  mainButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 20,
    paddingHorizontal: 70,
    borderRadius: 35,
    alignSelf: 'center',
    marginVertical: 20,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  mainButtonActive: {
    backgroundColor: '#E74C3C',
    shadowColor: '#E74C3C',
  },
  mainButtonText: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  historyIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C3E50',
  },
  historyConfidence: {
    fontSize: 12,
    color: '#27AE60',
    marginTop: 2,
    fontWeight: '600',
  },
  historyTime: {
    fontSize: 13,
    color: '#95A5A6',
    marginTop: 2,
  },
  noHistory: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECED',
  },
  backButton: {
    fontSize: 16,
    color: '#3498DB',
    fontWeight: '600',
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  settingsScroll: {
    flex: 1,
  },
  settingsSection: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECED',
  },
  settingsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7F8C8D',
    letterSpacing: 1.5,
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 3,
  },
  settingDesc: {
    fontSize: 13,
    color: '#95A5A6',
  },
  statsBox: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statLabel: {
    fontSize: 15,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: 'bold',
  },
  noStatsText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  aboutBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 12,
  },
  aboutTeam: {
    fontSize: 13,
    color: '#95A5A6',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  aboutMode: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '600',
  },
  editorHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  editorIcon: {
    fontSize: 64,
    marginBottom: 10,
  },
  editorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  editorSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  patternSelectButton: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E8ECED',
  },
  patternSelectButtonActive: {
    borderColor: '#27AE60',
    backgroundColor: '#E8F8F5',
  },
  patternSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patternSelectLeft: {
    flex: 1,
  },
  patternSelectLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  patternSelectLabelActive: {
    color: '#27AE60',
  },
  patternSelectDesc: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  patternSelectCheck: {
    fontSize: 28,
    color: '#27AE60',
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#27AE60',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  testButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  soundControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editVibrationButton: {
    backgroundColor: '#ECF0F1',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editVibrationText: {
    fontSize: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
});