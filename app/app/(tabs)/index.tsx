import { useEffect, useRef, useState } from "react";
import { StyleSheet, Pressable, Alert, View } from "react-native";
import { Audio } from "expo-av";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PROMPTS } from "@/data/prompts";

function randomIndex(max: number) {
  return Math.floor(Math.random() * max);
}

// Map dB meter values (often ~ -160..0) into 0..1.
function meterDbToLevel(db: number | null | undefined) {
  if (db === null || db === undefined) return 0;
  const clamped = Math.max(-60, Math.min(0, db));
  return (clamped + 60) / 60; // -60 => 0, 0 => 1
}

export default function HomeScreen() {
  const [promptIdx, setPromptIdx] = useState(() => randomIndex(PROMPTS.length));
  const prompt = PROMPTS[promptIdx];

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0); // 0..1
  const [hasRealMeter, setHasRealMeter] = useState(false);
  const WAVE_POINTS = 50; // ~5 seconds at 10 updates/sec
  const [wave, setWave] = useState<number[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackMeterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (fallbackMeterRef.current) clearInterval(fallbackMeterRef.current);
      sound?.unloadAsync().catch(() => {});
      recording?.stopAndUnloadAsync().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestMicPermission() {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Microphone permission is required.");
      return false;
    }
    return true;
  }

  function startFallbackMeter() {
    // Smooth-ish visual feedback even when real metering is unavailable.
    // This is intentionally "approximate" — it reassures the user that recording is active.
    if (fallbackMeterRef.current) clearInterval(fallbackMeterRef.current);
    fallbackMeterRef.current = setInterval(() => {
   setLevel((prev) => {
  const target = 0.15 + Math.random() * 0.75; // 0.15..0.9
  const lv = prev + (target - prev) * 0.35;

setWave((prev) => {
  const base = prev.length === WAVE_POINTS ? prev : Array(WAVE_POINTS).fill(0);
  return [...base.slice(1), lv]; // drop oldest, add newest at end
});


  return lv;
});

    }, 120);
  }

  function stopFallbackMeter() {
    if (fallbackMeterRef.current) {
      clearInterval(fallbackMeterRef.current);
      fallbackMeterRef.current = null;
    }
  }

  async function startRecording() {
    const ok = await requestMicPermission();
    if (!ok) return;

    try {
      // Stop playback if currently playing
      if (sound && isPlaying) {
        await sound.stopAsync();
        await sound.setPositionAsync(0);
        setIsPlaying(false);
      }

      // Clear previous playback so Play matches the latest take
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      setElapsedMs(0);
      setLevel(0);
      setHasRealMeter(false);
      setWave(Array(WAVE_POINTS).fill(0));



      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();

      const recordingOptions: Audio.RecordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        ios: {
  ...(Audio.RecordingOptionsPresets.HIGH_QUALITY.ios as any),
  isMeteringEnabled: true,
},
android: {
  ...(Audio.RecordingOptionsPresets.HIGH_QUALITY.android as any),
  isMeteringEnabled: true,
},

      };

      rec.setProgressUpdateInterval(100);

      rec.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) return;

        // metering may be undefined on some platforms/runtimes.
        // @ts-ignore: expo-av status may include `metering` at runtime, but types don't always reflect it
       const db = status.metering as number | undefined;

        if (typeof db === "number") {
          setHasRealMeter(true);
          stopFallbackMeter();
          
          const lv = meterDbToLevel(db);
setLevel(lv);
setWave((prev) => {
  const base = prev.length === WAVE_POINTS ? prev : Array(WAVE_POINTS).fill(0);
  return [...base.slice(1), lv]; // drop oldest, add newest at end
});


        } else if (!hasRealMeter) {
          // keep fallback going
        }
      });

      await rec.prepareToRecordAsync(recordingOptions);
      await rec.startAsync();
      setRecording(rec);

      // Start fallback meter immediately; it will auto-disable if real metering appears.
      startFallbackMeter();

      // Timer UI tick
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setElapsedMs((ms) => ms + 100), 100);
    } catch {
      setRecording(null);
      setLevel(0);
      stopFallbackMeter();
      Alert.alert("Failed to start recording");
    }
  }

  async function stopRecording() {
    if (!recording) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopFallbackMeter();

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setLevel(0);
      setWave([]);


      if (!uri) return;

      const { sound } = await Audio.Sound.createAsync(
  { uri },
  { shouldPlay: false, isLooping: false }
);


      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          setIsPlaying(false);
          return;
        }
        setIsPlaying(status.isPlaying);

        // When playback finishes, flip back to Play state
               if (status.didJustFinish) {
          setIsPlaying(false);
          // Don't reset position here; it can trigger looping on some platforms.
          // Next Play starts from 0 anyway.
        }

      });

      setSound(sound);
    } catch {
      setRecording(null);
      setLevel(0);
      Alert.alert("Failed to stop recording");
    }
  }

  async function playOrStop() {
    if (!sound) return;

    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      await sound.stopAsync();
  await sound.setIsLoopingAsync(false);
    await sound.setPositionAsync(0);
      setIsPlaying(false);
    } else {
      await sound.playFromPositionAsync(0);
    }
  }

  function nextPrompt() {
    let next = randomIndex(PROMPTS.length);
    while (next === promptIdx) next = randomIndex(PROMPTS.length);
    setPromptIdx(next);
  }

  const isRecording = !!recording;
  const seconds = (elapsedMs / 1000).toFixed(1);
  const meterWidthPct = Math.round(level * 100);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">VoiceCoach</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Prompt</ThemedText>
        <ThemedText style={styles.prompt}>{prompt}</ThemedText>

        {isRecording ? (
          <>
            <ThemedText style={styles.recordingLine}>
              ● Recording… {seconds}s
            </ThemedText>

 
            <View style={styles.waveRow} accessibilityLabel="Live waveform">
              {wave.map((v, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    { height: 4 + Math.round(v * 28) }, // min 4px, max ~32px
                  ]}
                />
              ))}
            </View>

           
          </>
        ) : sound ? (
          <ThemedText style={styles.readyLine}>
            Take ready. Press {isPlaying ? "Stop" : "Play"}.
          </ThemedText>
        ) : (
          <ThemedText style={styles.readyLine}>Press Record to start.</ThemedText>
        )}
      </ThemedView>

      <ThemedView style={styles.controls}>
        {!isRecording ? (
          <Pressable style={styles.button} onPress={startRecording}>
            <ThemedText>Record</ThemedText>
          </Pressable>
        ) : (
          <Pressable style={styles.button} onPress={stopRecording}>
            <ThemedText>Stop</ThemedText>
          </Pressable>
        )}

        <Pressable
          style={[styles.button, (!sound || isRecording) && styles.disabled]}
          onPress={playOrStop}
          disabled={!sound || isRecording}
        >
          <ThemedText>{isPlaying ? "Stop" : "Play"}</ThemedText>
        </Pressable>

        <Pressable style={styles.button} onPress={nextPrompt} disabled={isRecording}>
          <ThemedText>New prompt</ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
    justifyContent: "center",
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  prompt: {
    fontSize: 18,
    lineHeight: 26,
  },
  recordingLine: {
    fontSize: 14,
  },
  readyLine: {
    fontSize: 14,
    opacity: 0.75,
  },
    meterTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
    backgroundColor: "rgba(0,0,0,0.10)",
  },

    meterFill: {
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.65)",
  },

    waveRow: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  meterHint: {
    fontSize: 12,
    opacity: 0.65,
  },
  controls: {
    gap: 12,
    alignItems: "center",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
  },
    disabled: {
    opacity: 0.4,
  }
});
