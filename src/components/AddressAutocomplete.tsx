import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useTheme } from '../context/ThemeContext';
import { GOOGLE_PLACES_API_KEY } from '../config';

interface AddressAutocompleteProps {
  label: string;
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

const isConfigured = GOOGLE_PLACES_API_KEY !== 'YOUR_GOOGLE_PLACES_API_KEY';

export function AddressAutocomplete({
  label,
  value,
  onChange,
  placeholder = 'Search address...',
}: AddressAutocompleteProps) {
  const { theme } = useTheme();
  const ref = useRef<any>(null);

  useEffect(() => {
    if (ref.current && value) {
      ref.current.setAddressText(value);
    }
  }, []);

  if (!isConfigured) {
    // Fallback to plain text input when no API key is configured
    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
        <View
          style={[
            styles.fallbackInput,
            {
              backgroundColor: theme.colors.inputBackground,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <GooglePlacesAutocomplete
            ref={ref}
            placeholder={placeholder}
            onPress={() => {}}
            textInputProps={{
              value,
              onChangeText: onChange,
              placeholderTextColor: theme.colors.tabBarInactive,
              style: {
                flex: 1,
                fontSize: 16,
                color: theme.colors.text,
                padding: 0,
              },
            }}
            enablePoweredByContainer={false}
            fetchDetails={false}
            query={{ key: '', language: 'en' }}
            styles={{
              container: { flex: 0 },
              textInputContainer: { backgroundColor: 'transparent', padding: 0 },
              textInput: { backgroundColor: 'transparent', margin: 0, padding: 0, fontSize: 16, color: theme.colors.text },
            }}
          />
        </View>
        <Text style={[styles.hint, { color: theme.colors.tabBarInactive }]}>
          Add a Google Places API key in src/config.ts for autocomplete
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <GooglePlacesAutocomplete
        ref={ref}
        placeholder={placeholder}
        onPress={(data, details = null) => {
          const addr = details?.formatted_address || data.description;
          onChange(addr);
        }}
        textInputProps={{
          placeholderTextColor: theme.colors.tabBarInactive,
          onChangeText: (text: string) => {
            onChange(text);
          },
        }}
        query={{
          key: GOOGLE_PLACES_API_KEY,
          language: 'en',
          types: 'address',
        }}
        fetchDetails
        enablePoweredByContainer={false}
        debounce={300}
        minLength={3}
        styles={{
          container: {
            flex: 0,
            zIndex: 10,
          },
          textInputContainer: {
            backgroundColor: 'transparent',
          },
          textInput: {
            backgroundColor: theme.colors.inputBackground,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: theme.colors.text,
            height: 48,
          },
          listView: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 12,
            marginTop: 4,
            overflow: 'hidden',
          },
          row: {
            backgroundColor: theme.colors.surface,
            paddingVertical: 12,
            paddingHorizontal: 14,
          },
          separator: {
            backgroundColor: theme.colors.border,
            height: StyleSheet.hairlineWidth,
          },
          description: {
            color: theme.colors.text,
            fontSize: 14,
          },
          poweredContainer: {
            display: 'none',
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    zIndex: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  fallbackInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
