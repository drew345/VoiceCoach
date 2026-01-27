import { useEffect, useState } from "react";
import { StyleSheet, Pressable, Alert } from "react-native";
import { Audio } from "expo-av";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

const PROMPTS: string[] = [
  "You don't have to be great to start, but you have to start to be great.",
  "Courage is grace under pressure.",
  "Speak slower than you think you need to.",
  "Make it sound effortless—then do it again.",
  "You are not late. You are learning.",
];

function randomIndex(max: number) {
  return Math.floor(Math.random() * max);
}

export default function HomeScreen() {
  const [promptIdx, setPromptIdx] = useState(() =>
    randomIndex(PROMPTS.length)
  );
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const prompt = PROMPTS[promptIdx];

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

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
    } catch (err) {
      Alert.alert("Failed to start recording");
    }
  }

  async function stopRecording() {
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();

    const { sound } = await Audio.Sound.createAsync({ uri });
    setSound(sound);
    setRecording(null);
  }

  async function playRecording() {
    if (!sound) return;
    await sound.replayAsync();
  }

  function nextPrompt() {
    let next = randomIndex(PROMPTS.length);
    while (next === promptIdx) {
      next = randomIndex(PROMPTS.length);
    }
    setPromptIdx(next);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">VoiceCoach</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Prompt</ThemedText>
        <ThemedText style={styles.prompt}>{prompt}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.controls}>
        {!recording ? (
          <Pressable style={styles.button} onPress={startRecording}>
            <ThemedText>Record</ThemedText>
          </Pressable>
        ) : (
          <Pressable style={styles.button} onPress={stopRecording}>
            <ThemedText>Stop</ThemedText>
          </Pressable>
        )}

        <Pressable
          style={[styles.button, !sound && styles.disabled]}
          onPress={playRecording}
          disabled={!sound}
        >
          <ThemedText>Play</ThemedText>
        </Pressable>

        <Pressable style={styles.button} onPress={nextPrompt}>
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
    gap: 8,
  },
  prompt: {
    fontSize: 18,
    lineHeight: 26,
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
