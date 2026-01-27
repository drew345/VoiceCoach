import { useState } from "react";
import { StyleSheet, Pressable } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

const PROMPTS: string[] = [
  "You don't have to be great to start, but you have to start to be great.",
  "Tell me what you want, and I'll tell you who you are.",
  "The truth is rarely pure and never simple.",
  "I have measured out my life with coffee spoons.",
  "Courage is grace under pressure.",
  "If you can’t explain it simply, you don’t understand it well enough.",
  "Today, I choose clarity over confusion.",
  "The work is the work. Do it anyway.",
  "I can be calm and intense at the same time.",
  "Make it sound effortless—then do it again.",
  "You are not late. You are learning.",
  "Speak slower than you think you need to.",
];

function randomIndex(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive);
}

export default function HomeScreen() {
  const [idx, setIdx] = useState(() => randomIndex(PROMPTS.length));
  const [tapCount, setTapCount] = useState(0);

  const prompt = PROMPTS[idx];

  const nextPrompt = () => {
    if (PROMPTS.length <= 1) return;

    let next = randomIndex(PROMPTS.length);
    while (next === idx) next = randomIndex(PROMPTS.length);

    setIdx(next);
    setTapCount((c) => c + 1);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        VoiceCoach
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle" style={styles.label}>
          Prompt
        </ThemedText>
        <ThemedText style={styles.prompt}>{prompt}</ThemedText>
      </ThemedView>

      <Pressable style={styles.button} onPress={nextPrompt}>
        <ThemedText style={styles.buttonText}>New prompt</ThemedText>
      </Pressable>

      <ThemedText style={styles.note}>Button taps: {tapCount}</ThemedText>
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
  title: {
    textAlign: "center",
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  label: {
    opacity: 0.8,
  },
  prompt: {
    fontSize: 18,
    lineHeight: 26,
  },
  button: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
  },
  note: {
    textAlign: "center",
    opacity: 0.75,
  },
});
