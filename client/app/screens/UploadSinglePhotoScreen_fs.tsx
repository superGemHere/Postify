import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Image, TextInput, Alert, TouchableOpacity, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { usePostStore } from '../../store/postStore';
import { useAuthStore } from '../../store/authStore';

export default function UploadSinglePhotoScreen_fs() {
	const [image, setImage] = useState<string | null>(null);
	const [caption, setCaption] = useState('');
	const [uploading, setUploading] = useState(false);
	
	const addPost = usePostStore(state => state.addPost);
	const removePost = usePostStore(state => state.removePost);
	const replacePost = usePostStore(state => state.replacePost);
	const user = useAuthStore(state => state.user);

	const pickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') {
			Alert.alert('Permission required', 'You need to grant media library permission to select images.');
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: 'images',
			allowsEditing: true,
			quality: 0.8,
		});
		if (!result.canceled && result.assets && result.assets.length > 0) {
			setImage(result.assets[0].uri);
		}
	};

	const uploadImage = async () => {
		if (!image || !user) return;
		setUploading(true);
		
		// Create temporary post for optimistic update
		const tempId = Math.random().toString(36).slice(2);
		const tempPost = {
			id: tempId,
			user_id: user.id,
			media_urls: [image], // Use local image URI temporarily
			media_type: 'image',
			caption,
			created_at: new Date().toISOString(),
		};
		
		// Add to store immediately for instant UI update
		addPost(tempPost);
		
		try {
			// Read file as base64
			const fileExt = image.split('.').pop();
			const fileName = `${user.id}/photo-${Date.now()}.${fileExt}`;
			const contentType = `image/${fileExt}`;
			const fileData = await FileSystem.readAsStringAsync(image, { encoding: FileSystem.EncodingType.Base64 });
			const fileBuffer = decode(fileData);

			// Upload to Supabase Storage
			const { data: storageData, error: storageError } = await supabase.storage
				.from('photos')
				.upload(fileName, fileBuffer, { contentType });
			if (storageError) throw storageError;

			// Get public URL
			const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(fileName);
			const mediaUrl = publicUrlData.publicUrl;

			// Insert post into DB and get real post data
			const { data: dbData, error: dbError } = await supabase.from('posts').insert([
				{
					user_id: user.id,
					media_urls: [mediaUrl],
					media_type: 'image',
					caption,
				},
			]).select();
			
			if (dbError) throw dbError;
			
			if (dbData && dbData.length > 0) {
				// Replace temporary post with real one
				const realPost = {
					...dbData[0],
					media_urls: Array.isArray(dbData[0].media_urls) 
						? dbData[0].media_urls 
						: [dbData[0].media_urls],
				};
				replacePost(tempId, realPost);
			}
			
			Alert.alert('Success', 'Image uploaded and post created!');
			setImage(null);
			setCaption('');
		} catch (e: any) {
			Alert.alert('Upload failed', e.message);
			// Remove the temporary post on error
			removePost(tempId);
		} finally {
			setUploading(false);
		}
	};

	return (
		<KeyboardAvoidingView 
			style={styles.container} 
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
		>
			<ScrollView 
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<Text style={styles.title}>Upload Single Photo FSS</Text>
				<TouchableOpacity onPressIn={pickImage} style={styles.button}>
					<Text style={styles.buttonText}>Pick an image</Text>
				</TouchableOpacity>
				{image && (
					<Image source={{ uri: image }} style={styles.image} />
				)}
				<TextInput
					style={styles.input}
					placeholder="Add a caption..."
					value={caption}
					onChangeText={setCaption}
					multiline
					numberOfLines={3}
				/>
				<TouchableOpacity onPressIn={uploadImage} disabled={!image || uploading} style={styles.button}>
					<Text style={styles.buttonText}>{uploading ? 'Uploading...' : 'Upload'}</Text>
				</TouchableOpacity>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	scrollContent: {
		flexGrow: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		gap: 30,
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 16,
	},
	image: {
		width: 220,
		height: 220,
		borderRadius: 12,
		marginVertical: 16,
	},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		padding: 10,
		width: '100%',
		marginBottom: 16,
		minHeight: 80,
		textAlignVertical: 'top',
	},
	button: {
		backgroundColor: '#007bff',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		marginVertical: 8,
		minWidth: 120,
	},
	buttonText: {
		color: '#fff',
		textAlign: 'center',
		fontWeight: 'bold',
		fontSize: 16,
	},
});
