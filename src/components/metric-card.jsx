import { Text, View } from 'react-native';

import { colors, radii } from '../constants/theme';

const formatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function MetricCard({ label, value, icon: Icon, tone = colors.primary }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 104,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        gap: 10,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          backgroundColor: `${tone}16`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon color={tone} size={18} strokeWidth={2.2} />
      </View>
      <View style={{ gap: 2 }}>
        <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {formatter.format(value)}
        </Text>
        <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      </View>
    </View>
  );
}
