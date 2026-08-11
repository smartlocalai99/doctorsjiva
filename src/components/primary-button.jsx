import { ActivityIndicator, Pressable, Text } from 'react-native';

import { colors, radii } from '../constants/theme';

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  tone = 'primary',
  icon: Icon,
}) {
  const isDisabled = disabled || loading;
  const backgroundColor = tone === 'secondary' ? colors.primarySoft : colors.primary;
  const foreground = tone === 'secondary' ? colors.primaryDark : colors.white;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: radii.md,
        backgroundColor,
        opacity: isDisabled ? 0.5 : pressed ? 0.86 : 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 9,
        paddingHorizontal: 18,
      })}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {Icon ? <Icon color={foreground} size={19} strokeWidth={2.4} /> : null}
          <Text style={{ color: foreground, fontSize: 16, fontWeight: '700' }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
