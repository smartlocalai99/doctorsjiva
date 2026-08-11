import { Text, TextInput, View } from 'react-native';

import { colors, radii } from '../constants/theme';

export function FormField({
  label,
  hint,
  multiline = false,
  style,
  inputStyle,
  ...inputProps
}) {
  return (
    <View style={[{ gap: 7 }, style]}>
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <TextInput
        placeholderTextColor="#98A2AB"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          {
            minHeight: multiline ? 112 : 50,
            paddingHorizontal: 15,
            paddingVertical: multiline ? 14 : 10,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.sm,
            backgroundColor: colors.surface,
            color: colors.ink,
            fontSize: 15,
          },
          inputStyle,
        ]}
        {...inputProps}
      />
      {hint ? <Text style={{ color: colors.inkMuted, fontSize: 12, lineHeight: 17 }}>{hint}</Text> : null}
    </View>
  );
}
