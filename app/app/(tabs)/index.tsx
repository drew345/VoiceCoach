import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
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
  const [soundPromptIdx, setSoundPromptIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0); // 0..1
  const [hasRealMeter, setHasRealMeter] = useState(false);
  const [wave, setWave] = useState<number[]>([]);

  const WAVE_POINTS = 50; // ~5 seconds at 10 updates/sec

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
    // This is intentionally approximate: it reassures the user that recording is active.
    if (fallbackMeterRef.current) clearInterval(fallbackMeterRef.current);

    fallbackMeterRef.current = setInterval(() => {
      setLevel((prev) => {
        const target = 0.15 + Math.random() * 0.75; // 0.15..0.9
        const nextLevel = prev + (target - prev) * 0.35;

        setWave((prevWave) => {
          const base =
            prevWave.length === WAVE_POINTS ? prevWave : Array(WAVE_POINTS).fill(0);
          return [...base.slice(1), nextLevel];
        });

        return nextLevel;
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
      if (sound && isPlaying) {
        await sound.stopAsync();
        await sound.setPositionAsync(0);
        setIsPlaying(false);
      }

      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setSoundPromptIdx(null);
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

        // @ts-ignore: expo-av status may include `metering` at runtime, but types do not always reflect it.
        const db = status.metering as number | undefined;

        if (typeof db === "number") {
          setHasRealMeter(true);
          stopFallbackMeter();

          const nextLevel = meterDbToLevel(db);
          setLevel(nextLevel);
          setWave((prevWave) => {
            const base =
              prevWave.length === WAVE_POINTS ? prevWave : Array(WAVE_POINTS).fill(0);
            return [...base.slice(1), nextLevel];
          });
        } else if (!hasRealMeter) {
          // Keep fallback animation running when native metering is unavailable.
        }
      });

      await rec.prepareToRecordAsync(recordingOptions);
      await rec.startAsync();
      setRecording(rec);

      startFallbackMeter();

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

      const { sound: nextSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, isLooping: false }
      );

      nextSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          setIsPlaying(false);
          return;
        }

        setIsPlaying(status.isPlaying);

        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });

      setSound(nextSound);
      setSoundPromptIdx(promptIdx);
    } catch {
      setRecording(null);
      setLevel(0);
      Alert.alert("Failed to stop recording");
    }
  }

  async function playOrStop() {
    if (!sound) return;

    if (soundPromptIdx !== null && promptIdx !== soundPromptIdx) {
      setPromptIdx(soundPromptIdx);
    }

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
  const displayedWave =
    isRecording && wave.length > 0 ? wave : Array(WAVE_POINTS).fill(0.08);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">VoiceCoach</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Prompt</ThemedText>
        <ThemedText style={styles.prompt}>{prompt}</ThemedText>

        <View style={styles.statusArea}>
          {isRecording ? (
            <ThemedText style={styles.recordingLine}>Recording... {seconds}s</ThemedText>
          ) : sound ? (
            <ThemedText style={styles.readyLine}>
              Take ready. Press {isPlaying ? "Stop" : "Play"}.
            </ThemedText>
          ) : (
            <ThemedText style={styles.readyLine}>Press Record to start.</ThemedText>
          )}

          <View style={styles.waveRow} accessibilityLabel="Live waveform">
            {displayedWave.map((v, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  !isRecording && styles.waveBarIdle,
                  { height: isRecording ? 4 + Math.round(v * 28) : 2 + Math.round(v * 4) },
                ]}
              />
            ))}
          </View>
        </View>
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
  statusArea: {
    minHeight: 60,
    justifyContent: "flex-start",
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
  waveBarIdle: {
    backgroundColor: "rgba(0,0,0,0.16)",
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
  },
});
