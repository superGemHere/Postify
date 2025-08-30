import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthButton } from '@/components/AuthButton';
import { useAuthStore } from '../../store/authStore';
import { GradientTitle } from '@/components/GradientTitle';

export default function AuthScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const { login, register, loading, error } = useAuthStore();
  const [isRegister, setIsRegister] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (isRegister) {
      await register(email, password, name);
    } else {
      await login(email, password);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <View style={styles.container}>
        <GradientTitle 
          text="Postify" 
          xAlignment='center' 
          addContainerStyles={{ marginBottom: 40 }} 
          addTextStyles={{ textAlign: 'center' }} 
        />
        {/* <Text style={styles.title}>{isRegister ? 'Register' : 'Login'}</Text> */}
        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <AuthButton
          title={isRegister ? 'Register' : 'Login'}
          onPress={handleSubmit}
          loading={loading}
        />
        <Text style={{ textAlign: 'center', marginVertical: 12, fontWeight: '500' }}>OR</Text>
        <AuthButton
          title={isRegister ? 'Go to Login ' : "Go to Register"}
          onPress={() => setIsRegister((prev) => !prev)}
          containerStyles={{ backgroundColor: 'transparent', marginBottom: 0, borderWidth: 0, elevation: 0 }}
          textStyles={{ color: '#808080' }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  error: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
});
