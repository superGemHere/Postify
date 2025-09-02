import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, KeyboardAvoidingView, Platform, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { AuthButton } from '@/components/AuthButton';
import { useAuthStore } from '../../store/authStore';
import { GradientTitle } from '@/components/GradientTitle';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

export default function AuthScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const { login, register, loading, error } = useAuthStore();
  const [isRegister, setIsRegister] = useState<boolean>(false);

  const [info, setInfo] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    name?: string;
  }>({});

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'You need to grant media library permission to select an avatar.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for avatars
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
    }
  };

  const validateFields = () => {
    const errors: typeof fieldErrors = {};
    
    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!password.trim()) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    // Registration-specific validations
    if (isRegister) {
      if (!name.trim()) {
        errors.name = 'Name is required';
      }
      
      if (!confirmPassword.trim()) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateFields()) {
      return;
    }
    
    if (isRegister) {
      if (!avatar) {
        Alert.alert('Avatar Required', 'Please select an avatar image to complete registration.');
        return;
      }
      console.log('Starting registration with avatar:', avatar);
      const result = await register(email, password, name, avatar);
      // After registration, show info and redirect to login
      setInfo('Registration successful! Please check your email to confirm your account before logging in.');
      setIsRegister(false);
      setAvatar(null); // Clear avatar after registration
      setConfirmPassword('');
      setFieldErrors({});
    } else {
      await login(email, password);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
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
              <>
                <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>Tap to select avatar</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, fieldErrors.name && styles.inputError]}
                  placeholder="Name"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (fieldErrors.name) {
                      setFieldErrors(prev => ({ ...prev, name: undefined }));
                    }
                  }}
                />
                {fieldErrors.name && <Text style={styles.errorText}>{fieldErrors.name}</Text>}
              </>
            )}
            <TextInput
              style={[styles.input, fieldErrors.email && styles.inputError]}
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (fieldErrors.email) {
                  setFieldErrors(prev => ({ ...prev, email: undefined }));
                }
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}
            
            <TextInput
              style={[styles.input, fieldErrors.password && styles.inputError]}
              placeholder="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (fieldErrors.password) {
                  setFieldErrors(prev => ({ ...prev, password: undefined }));
                }
              }}
              secureTextEntry
            />
            {fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}
            
            {isRegister && (
              <>
                <TextInput
                  style={[styles.input, fieldErrors.confirmPassword && styles.inputError]}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                  secureTextEntry
                />
                {fieldErrors.confirmPassword && <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text>}
              </>
            )}
      {error && <Text style={styles.error}>{error}</Text>}
      {info && <Text style={styles.info}>{info}</Text>}
          <AuthButton
            title={isRegister ? 'Register' : 'Login'}
            onPress={handleSubmit}
            loading={loading}
          />
          <Text style={{ textAlign: 'center', marginVertical: 12, fontWeight: '500' }}>OR</Text>
          <AuthButton
            title={isRegister ? 'Go to Login ' : "Go to Register"}
            onPress={() => {
              setIsRegister((prev) => !prev);
              setAvatar(null);
              setInfo('');
              setConfirmPassword('');
              setFieldErrors({});
            }}
            containerStyles={{ backgroundColor: 'transparent', marginBottom: 0, borderWidth: 0, elevation: 0 }}
            textStyles={{ color: '#808080' }}
          />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
		flex: 1,
		backgroundColor: '#fff',
	},
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
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
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  error: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
  info: {
    color: 'green',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
