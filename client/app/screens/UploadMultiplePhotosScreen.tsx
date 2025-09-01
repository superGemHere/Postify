import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Alert, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';

export default function UploadMultiplePhotosScreen() {
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'You need to grant media library permission to select images.');
      return;
    }
    let result;
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // Try multiple selection if supported
      try {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          allowsMultipleSelection: true,
          quality: 0.8,
          selectionLimit: 10, 
        });
      } catch (e) {
        // Fallback to single selection if multiple not supported
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      }
    } else {
      // Web or other platforms: single selection only
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
    }
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages(result.assets.map(asset => asset.uri));
    }
  };

  const uploadImages = async () => {
    if (images.length === 0) return;
    setUploading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Not logged in', 'Please log in before uploading.');
        setUploading(false);
        return;
      }

      const urls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const fileExt = image.split('.').pop();
        const fileName = `${user.id}/photo-${Date.now()}-${i}.${fileExt}`;
        const contentType = `image/${fileExt}`;
        const fileData = await FileSystem.readAsStringAsync(image, { encoding: FileSystem.EncodingType.Base64 });
        const fileBuffer = decode(fileData);
        const { data: storageData, error: storageError } = await supabase.storage
          .from('photos')
          .upload(fileName, fileBuffer, { contentType });
        if (storageError) throw storageError;
        const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(fileName);
        urls.push(publicUrlData.publicUrl);
      }

      const { error: dbError } = await supabase.from('posts').insert([
        {
          user_id: user.id,
          media_urls: urls,
          media_type: 'image',
          caption,
        },
      ]);
      if (dbError) throw dbError;
      Alert.alert('Success', 'Images uploaded and post created!');
      setImages([]);
      setCaption('');
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload Multiple Photos</Text>
      <TouchableOpacity onPressIn={pickImages} style={styles.button}>
        <Text style={styles.buttonText}>Pick images</Text>
      </TouchableOpacity>
      {images.length === 0 && (
        <Text style={{ color: '#888', marginBottom: 8 }}>No images selected</Text>
      )}
      <View style={styles.imagesRow}>
        {images.map((img, idx) => (
          <Image key={idx} source={{ uri: img }} style={styles.image} />
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Add a caption..."
        value={caption}
        onChangeText={setCaption}
      />
      <TouchableOpacity onPressIn={uploadImages} disabled={images.length === 0 || uploading} style={styles.button}>
        <Text style={styles.buttonText}>{uploading ? 'Uploading...' : 'Upload'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
    gap: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
    justifyContent: 'center',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginVertical: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
