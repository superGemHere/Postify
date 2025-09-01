import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { VideoView, useVideoPlayer } from 'expo-video';
import { supabase } from '../../lib/supabase';

export default function UploadVideoScreen() {
  const [video, setVideo] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const player = useVideoPlayer(video || '', (p: any) => { if (p && video) p.loop = true; });

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'You need to grant media library permission to select videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos',
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setVideo(result.assets[0].uri);
    }
  };

  const uploadVideo = async () => {
    if (!video) return;
    setUploading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Not logged in', 'Please log in before uploading.');
        setUploading(false);
        return;
      }
      const fileExt = video.split('.').pop();
      const fileName = `${user.id}/video-${Date.now()}.${fileExt}`;
      const contentType = `video/${fileExt}`;
      const fileData = await FileSystem.readAsStringAsync(video, { encoding: FileSystem.EncodingType.Base64 });
      const fileBuffer = decode(fileData);
      const { data: storageData, error: storageError } = await supabase.storage
        .from('videos')
        .upload(fileName, fileBuffer, { contentType });
      if (storageError) throw storageError;
      const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(fileName);
      const videoUrl = publicUrlData.publicUrl;
      
      const { error: dbError } = await supabase.from('posts').insert([
        {
          user_id: user.id,
          media_urls: [videoUrl],
          media_type: 'video',
          caption,
        },
      ]);
      if (dbError) throw dbError;
      Alert.alert('Success', 'Video uploaded and post created!');
      setVideo(null);
      setCaption('');
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Video</Text>
      <TouchableOpacity onPressIn={pickVideo} style={styles.button}>
        <Text style={styles.buttonText}>Pick a video</Text>
      </TouchableOpacity>
      {video && player && (
        <VideoView
          player={player}
          style={styles.video}
          allowsFullscreen
          allowsPictureInPicture
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Add a caption..."
        value={caption}
        onChangeText={setCaption}
      />
      <TouchableOpacity onPressIn={uploadVideo} disabled={!video || uploading} style={styles.button}>
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Upload</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  video: {
    width: 320,
    height: 220,
    borderRadius: 12,
    marginVertical: 16,
    backgroundColor: '#000',
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
