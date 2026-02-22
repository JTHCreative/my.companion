import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const PERSONALITY_TAGS = [
  'Animal-Friendly',
  'People-Friendly',
  'Shy',
  'Scared',
  'Aggressive',
  'Energetic',
  'Lazy',
  'Playful',
  'Calm',
  'Curious',
  'Affectionate',
  'Independent',
  'Loyal',
  'Stubborn',
  'Gentle',
  'Protective',
  'Vocal',
  'Quiet',
];

interface PersonalityTagPickerProps {
  value: string; // comma-separated tags, e.g. "Playful, Shy"
  onChange: (value: string) => void;
}

function parseTags(value: string): string[] {
  if (!value.trim()) return [];
  return value.split(',').map((t) => t.trim()).filter(Boolean);
}

function serializeTags(tags: string[]): string {
  return tags.join(', ');
}

export function PersonalityTagPicker({ value, onChange }: PersonalityTagPickerProps) {
  const { theme } = useTheme();
  const selected = parseTags(value);

  const toggle = (tag: string) => {
    const next = selected.includes(tag)
      ? selected.filter((t) => t !== tag)
      : [...selected, tag];
    onChange(serializeTags(next));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        Personality
      </Text>
      <View style={styles.tagGrid}>
        {PERSONALITY_TAGS.map((tag) => {
          const isActive = selected.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => toggle(tag)}
              activeOpacity={0.7}
              style={[
                styles.tag,
                {
                  backgroundColor: isActive
                    ? theme.colors.primary
                    : theme.colors.inputBackground,
                  borderColor: isActive
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  {
                    color: isActive ? '#FFFFFF' : theme.colors.text,
                  },
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
