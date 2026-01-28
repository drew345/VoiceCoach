import { useEffect, useRef, useState } from "react";
import { StyleSheet, Pressable, Alert, View } from "react-native";
import { Audio } from "expo-av";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PROMPTS } from "@/data/prompts";

function randomIndex(max: number) {
  return Math.floor(Math.random() * max);
}

// Map dB meter values (typically around -160..0) into 0..1.
function meterDbToLevel(db: number | null | undefined) {
  if (db === null || db === undefined) return 0;
  // Clamp to a realistic range
  const clamped = Math.max(-60, Math.min(0, db));
  // -60 => 0, 0 => 1
  return (clamped + 60) / 60;
}

export default function HomeScreen() {
  const [promptIdx, setPromptIdx] = useState(() =>
    randomIndex(PROMPTS.length)
  );

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0); // 0..1 input meter level

  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prompt = PROMPTS[promptIdx];

  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      sound?.unloadAsync();
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

  async function startRecording() {
    const ok = await requestMicPermission();
    if (!ok) return;

    try {
      // Clear previous playback so Play always matches the latest take.
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      setElapsedMs(0);
      setLevel(0);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();

      // Enable metering so we can show a live input level.
      const recordingOptions: Audio.RecordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          isMeteringEnabled: true,
        },
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          isMeteringEnabled: true,
        },
      };

      // Update interval for status callbacks (ms)
      rec.setProgressUpdateInterval(100);

      // Read metering from status updates
      rec.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) return;

        // @ts-expect-error: metering exists on RecordingStatus in expo-av
        const db = status.metering as number | undefined;
        setLevel(meterDbToLevel(db));
      });

      await rec.prepareToRecordAsync(recordingOptions);
      await rec.startAsync();
      setRecording(rec);

      // Timer UI tick
      tickIntervalRef.current = setInterval(() => {
        setElapsedMs((ms) => ms + 100);
      }, 100);
    } catch {
      setRecording(null);
      setLevel(0);
      Alert.alert("Failed to start recording");
    }
  }

  async function stopRecording() {
    if (!recording) return;

    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setLevel(0);

      if (!uri) return;

      const { sound } = await Audio.Sound.createAsync({ uri });
      setSound(sound);
    } catch {
      setRecording(null);
      setLevel(0);
      Alert.alert("Failed to stop recording");
    }
  }

  async function playRecording() {
    if (!sound) return;
    await sound.replayAsync();
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

            <View style={styles.meterTrack} accessibilityLabel="Input level meter">
              <View style={[styles.meterFill, { width: `${meterWidthPct}%` }]} />
            </View>

            <ThemedText style={styles.meterHint}>
              Input level
            </ThemedText>
          </>
        ) : sound ? (
          <ThemedText style={styles.readyLine}>Take ready. Press Play.</ThemedText>
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
          onPress={playRecording}
          disabled={!sound || isRecording}
        >
          <ThemedText>Play</ThemedText>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={nextPrompt}
          disabled={isRecording}
        >
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
    opacity: 0.85,
  },
  meterFill: {
    height: "100%",
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
  },
});
