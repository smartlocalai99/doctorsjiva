import { Text, View } from 'react-native';

import { colors, radii } from '../constants/theme';

const statusStyles = {
  published: { label: 'Published', background: colors.successSoft, foreground: colors.success },
  pending_review: { label: 'In review', background: colors.warningSoft, foreground: colors.warning },
  draft: { label: 'Draft', background: colors.surfaceMuted, foreground: colors.inkMuted },
  rejected: { label: 'Needs changes', background: colors.dangerSoft, foreground: colors.danger },
  archived: { label: 'Archived', background: colors.surfaceMuted, foreground: colors.inkMuted },
};

export function StatusPill({ status }) {
  const value = statusStyles[status] ?? statusStyles.draft;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radii.pill,
        backgroundColor: value.background,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Text style={{ color: value.foreground, fontSize: 12, fontWeight: '700' }}>{value.label}</Text>
    </View>
  );
}
