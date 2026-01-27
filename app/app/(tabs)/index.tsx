import { useEffect, useRef, useState } from "react";
import { StyleSheet, Pressable, Alert } from "react-native";
import { Audio } from "expo-av";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PROMPTS } from "@/data/prompts";

function randomIndex(max: number) {
  return Math.floor(Math.random() * max);
}

export default function HomeScreen() {
  const [promptIdx, setPromptIdx] = useState(() =>
    randomIndex(PROMPTS.length)
  );
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

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
      // Clear previous playback
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      setElapsedMs(0);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await rec.startAsync();
      setRecording(rec);

      tickIntervalRef.current = setInterval(() => {
        setElapsedMs((ms) => ms + 100);
      }, 100);
    } catch {
      setRecording(null);
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

      if (!uri) return;

      const { sound } = await Audio.Sound.createAsync({ uri });
      setSound(sound);
    } catch {
      setRecording(null);
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

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">VoiceCoach</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Prompt</ThemedText>
        <ThemedText style={styles.prompt}>{prompt}</ThemedText>

        {isRecording ? (
          <ThemedText style={styles.recordingLine}>
            ● Recording… {seconds}s
          </ThemedText>
        ) : sound ? (
          <ThemedText style={styles.readyLine}>
            Take ready. Press Play.
          </ThemedText>
        ) : (
          <ThemedText style={styles.readyLine}>
            Press Record to start.
          </ThemedText>
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
