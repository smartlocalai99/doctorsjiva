import { Image } from 'expo-image';
import { UserRound } from 'lucide-react-native';
import { View } from 'react-native';

import { colors } from '../constants/theme';

export function Avatar({ uri, size = 54 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        padding: 2,
        borderWidth: 1,
        borderColor: '#CCD5DB',
        backgroundColor: colors.white,
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          transition={180}
          style={{ flex: 1, borderRadius: size / 2 }}
        />
      ) : (
        <View
          style={{
            flex: 1,
            borderRadius: size / 2,
            backgroundColor: colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <UserRound color={colors.inkMuted} size={size * 0.48} strokeWidth={1.8} />
        </View>
      )}
    </View>
  );
}
