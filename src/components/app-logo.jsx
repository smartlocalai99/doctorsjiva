import { Stethoscope } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { colors } from '../constants/theme';

export function AppLogo({ compact = false, inverse = false }) {
  const foreground = inverse ? colors.white : colors.primary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: compact ? 38 : 48,
          height: compact ? 38 : 48,
          borderRadius: compact ? 13 : 17,
          backgroundColor: inverse ? 'rgba(255,255,255,0.16)' : colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stethoscope color={foreground} size={compact ? 22 : 28} strokeWidth={2.4} />
      </View>
      <View>
        <Text style={{ color: foreground, fontSize: compact ? 18 : 22, fontWeight: '800' }}>
          DRJIVA
        </Text>
        {!compact ? (
          <Text style={{ color: inverse ? '#DCEEFF' : colors.inkMuted, fontSize: 12, fontWeight: '600' }}>
            for doctors
          </Text>
        ) : null}
      </View>
    </View>
  );
}
