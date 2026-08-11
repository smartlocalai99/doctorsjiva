import { Redirect, useRouter } from 'expo-router';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo } from '../components/app-logo';
import { PrimaryButton } from '../components/primary-button';
import { colors, radii } from '../constants/theme';
import { useAuth } from '../context/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, signIn, enterDemo, isDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Redirect href="/(tabs)" />;

  const handleSignIn = async () => {
    if (!isDemo && (!email.trim() || !password)) {
      Alert.alert('Enter your credentials', 'Email and password are required.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Unable to sign in', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          minHeight: '100%',
          paddingTop: insets.top + 34,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 24,
          justifyContent: 'space-between',
          gap: 40,
        }}
      >
        <View style={{ gap: 36 }}>
          <AppLogo />
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: '800' }}>
              Welcome, Doctor
            </Text>
            <Text style={{ color: colors.inkMuted, fontSize: 16, lineHeight: 24 }}>
              Share trusted health guidance and connect with your patients.
            </Text>
          </View>

          <View style={{ gap: 15 }}>
            <LoginField
              icon={Mail}
              placeholder="Professional email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <LoginField
              icon={LockKeyhole}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              right={
                <Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((value) => !value)} hitSlop={10}>
                  {showPassword ? <EyeOff color={colors.inkMuted} size={20} /> : <Eye color={colors.inkMuted} size={20} />}
                </Pressable>
              }
            />
            <Pressable accessibilityRole="button" style={{ alignSelf: 'flex-end', paddingVertical: 2 }}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Forgot password?</Text>
            </Pressable>
            <PrimaryButton label={isDemo ? 'Open preview' : 'Sign in'} onPress={handleSignIn} loading={submitting} />

            {isDemo ? (
              <Pressable onPress={enterDemo} style={{ padding: 8, alignItems: 'center' }}>
                <Text style={{ color: colors.inkMuted, fontSize: 12, textAlign: 'center' }}>
                  Preview mode is active until Supabase environment values are added.
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={{ gap: 8, alignItems: 'center' }}>
          <Text style={{ color: colors.inkMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
            Access is limited to verified DRJIVA healthcare professionals.
          </Text>
          <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: '700' }}>
            Need access? Contact your administrator
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LoginField({ icon: Icon, right, ...inputProps }) {
  return (
    <View
      style={{
        minHeight: 54,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        gap: 11,
      }}
    >
      <Icon color={colors.inkMuted} size={20} strokeWidth={2} />
      <TextInput
        placeholderTextColor="#929DA6"
        style={{ flex: 1, color: colors.ink, fontSize: 15, paddingVertical: 13 }}
        {...inputProps}
      />
      {right}
    </View>
  );
}
