import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';
import 'react-native-get-random-values';

const secureOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureAuthStorage = {
  async getItem(key) {
    const encryptedValue = await AsyncStorage.getItem(key);
    if (!encryptedValue) return null;

    const encryptionKey = await SecureStore.getItemAsync(key, secureOptions);
    if (!encryptionKey) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    try {
      const cipher = new aesjs.ModeOfOperation.ctr(
        aesjs.utils.hex.toBytes(encryptionKey),
        new aesjs.Counter(1),
      );
      return aesjs.utils.utf8.fromBytes(
        cipher.decrypt(aesjs.utils.hex.toBytes(encryptedValue)),
      );
    } catch {
      await Promise.all([
        AsyncStorage.removeItem(key),
        SecureStore.deleteItemAsync(key, secureOptions),
      ]);
      return null;
    }
  },

  async setItem(key, value) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1),
    );
    const encryptedValue = aesjs.utils.hex.fromBytes(
      cipher.encrypt(aesjs.utils.utf8.toBytes(value)),
    );

    await SecureStore.setItemAsync(
      key,
      aesjs.utils.hex.fromBytes(encryptionKey),
      secureOptions,
    );
    await AsyncStorage.setItem(key, encryptedValue);
  },

  async removeItem(key) {
    await Promise.all([
      AsyncStorage.removeItem(key),
      SecureStore.deleteItemAsync(key, secureOptions),
    ]);
  },
};
