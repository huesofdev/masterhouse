import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform, Image, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useBranchStore } from '../../src/store/useBranchStore';
import { apiClient } from '../../src/lib/api';
import { SymbolView } from 'expo-symbols';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  violet: '#7C3AED', red: '#EF4444',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const setAuth = useAuthStore(state => state.setAuth);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // Attempt real login
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data.success) {
        setAuth(response.data.token, response.data.user);
        if (response.data.user?.branch_ids?.length > 0) {
          useBranchStore.getState().setActiveBranchId(response.data.user.branch_ids[0]);
        }
        router.replace('/');
      } else {
        Alert.alert('Login Failed', response.data.message || 'Invalid credentials');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[
            s.scrollContent,
            keyboardVisible && { justifyContent: 'flex-start', paddingTop: 20 }
          ]} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.content}>
            <View style={[s.logoContainer, keyboardVisible && { marginBottom: 16 }]}>
              {!keyboardVisible && (
                <View style={s.logoCircle}>
                  <Image 
                    source={require('../../assets/images/icon.png')} 
                    style={{ width: '100%', height: '100%', borderRadius: 24 }}
                    resizeMode="contain"
                  />
                </View>
              )}
              <Text style={[s.title, keyboardVisible && { fontSize: 28 }]}>Master House</Text>
              {!keyboardVisible && <Text style={s.subtitle}>Field Operations System</Text>}
            </View>

            <View style={s.form}>
              <Text style={s.label}>EMAIL</Text>
              <TextInput
                style={s.input}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
              
              <Text style={s.label}>PASSWORD</Text>
              <View style={s.passwordContainer}>
                <TextInput
                  style={s.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={s.eyeButton} 
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <SymbolView
                    name={showPassword 
                      ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                      : { ios: 'eye', android: 'visibility', web: 'visibility' }
                    }
                    size={22}
                    tintColor={C.gray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[s.loginBtn, loading && { opacity: 0.7 }]} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={s.loginBtnText}>Secure Login →</Text>
              )}
            </TouchableOpacity>

            <Text style={s.hint}>Offline Mode Supported</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 24, justifyContent: 'center' },
  
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: C.amberDim,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: C.amber,
  },
  title: { color: C.white, fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: C.gray, fontSize: 16, marginTop: 6, fontWeight: '500' },

  form: { marginBottom: 32 },
  label: { color: '#6B7280', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: C.card, color: C.white, paddingHorizontal: 18, borderRadius: 16,
    marginBottom: 20, borderWidth: 1, borderColor: C.cardBorder, fontSize: 16,
    height: 56,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    height: 56,
  },
  passwordInput: {
    flex: 1,
    color: C.white,
    paddingHorizontal: 18,
    fontSize: 16,
    height: '100%',
  },
  eyeButton: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },

  loginBtn: {
    backgroundColor: C.amber, borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  loginBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },

  hint: { color: '#4B5563', fontSize: 13, textAlign: 'center', marginTop: 24, fontWeight: '600' },
});
