import * as ImagePicker from 'expo-image-picker';
import { BadgeCheck, Camera, LogOut, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/avatar';
import { FormField } from '../../components/form-field';
import { PrimaryButton } from '../../components/primary-button';
import { colors, radii } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { useDoctorProfile, useUpdateDoctorProfile } from '../../hooks/use-doctor-data';

const emptyProfile = {
  display_name: '',
  username: '',
  specialty: '',
  qualifications: '',
  registration_number: '',
  bio: '',
  avatar_url: null,
  avatar_path: null,
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut, isDemo } = useAuth();
  const profileQuery = useDoctorProfile();
  const updateProfile = useUpdateDoctorProfile();
  const [draft, setDraft] = useState(null);
  const form = { ...emptyProfile, ...profileQuery.data, ...draft };

  const setField = (field, value) =>
    setDraft((current) => ({ ...form, ...current, [field]: value }));

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      setField('avatar', { ...result.assets[0], type: 'image' });
      setField('avatar_url', result.assets[0].uri);
    }
  };

  const save = async () => {
    try {
      const profile = await updateProfile.mutateAsync(form);
      setDraft(profile);
      Alert.alert('Profile updated', 'Your changes are now visible on your doctor profile.');
    } catch (error) {
      Alert.alert('Unable to update profile', error.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 17, paddingHorizontal: 18, paddingBottom: 36, gap: 22 }}
      >
        <View style={{ gap: 5 }}>
          <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '800' }}>Professional profile</Text>
          <Text style={{ color: colors.inkMuted, fontSize: 14 }}>This information appears with your health content.</Text>
        </View>

        <View
          style={{
            borderRadius: radii.lg,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 18,
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Pressable accessibilityLabel="Change profile picture" onPress={pickAvatar} style={{ position: 'relative' }}>
            <Avatar uri={form.avatar_url} size={96} />
            <View
              style={{
                position: 'absolute',
                right: 0,
                bottom: 1,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.primary,
                borderWidth: 2,
                borderColor: colors.white,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera color={colors.white} size={16} />
            </View>
          </Pressable>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800' }}>{form.display_name || 'Doctor'}</Text>
              {profileQuery.data?.verification_status === 'verified' ? <BadgeCheck color={colors.primary} fill={colors.primarySoft} size={20} /> : null}
            </View>
            <Text style={{ color: colors.inkMuted, fontSize: 13 }}>{form.specialty || 'Add your specialty'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radii.pill, backgroundColor: colors.successSoft, paddingHorizontal: 11, paddingVertical: 6 }}>
            <ShieldCheck color={colors.success} size={15} />
            <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>
              {profileQuery.data?.verification_status === 'verified' ? 'Identity verified' : 'Verification pending'}
            </Text>
          </View>
        </View>

        <View style={{ gap: 17 }}>
          <FormField label="Full professional name" value={form.display_name} onChangeText={(value) => setField('display_name', value)} placeholder="Dr. Full Name" />
          <FormField label="Username" value={form.username} onChangeText={(value) => setField('username', value)} placeholder="doctorname" autoCapitalize="none" hint="Letters, numbers, underscore and period only." />
          <FormField label="Specialty" value={form.specialty} onChangeText={(value) => setField('specialty', value)} placeholder="Example: Cardiologist" />
          <FormField label="Qualifications" value={form.qualifications} onChangeText={(value) => setField('qualifications', value)} placeholder="MBBS, MD" />
          <FormField label="Medical registration number" value={form.registration_number} onChangeText={(value) => setField('registration_number', value)} placeholder="Registration number" editable={profileQuery.data?.verification_status !== 'verified'} hint={profileQuery.data?.verification_status === 'verified' ? 'Contact support to change a verified registration number.' : 'Required for professional verification.'} />
          <FormField label="Bio" value={form.bio} onChangeText={(value) => setField('bio', value)} placeholder="Tell patients about your approach..." multiline maxLength={300} hint={`${form.bio?.length ?? 0}/300 characters`} />
        </View>

        <PrimaryButton label="Save profile" onPress={save} loading={updateProfile.isPending} />

        {isDemo ? (
          <View style={{ borderRadius: radii.md, backgroundColor: colors.primarySoft, padding: 14 }}>
            <Text style={{ color: colors.primaryDark, fontSize: 12, lineHeight: 18 }}>
              Preview mode: profile changes are stored only on this device until Supabase is connected.
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('Sign out?', 'You can sign in again with your doctor account.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: signOut },
          ])}
          style={({ pressed }) => ({
            minHeight: 50,
            borderRadius: radii.md,
            backgroundColor: pressed ? colors.dangerSoft : colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          })}
        >
          <LogOut color={colors.danger} size={18} />
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
