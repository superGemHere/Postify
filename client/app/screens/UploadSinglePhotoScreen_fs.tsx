import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Image, TextInput, Alert, TouchableOpacity, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';

export default function UploadSinglePhotoScreen_fs() {
	const [image, setImage] = useState<string | null>(null);
	const [caption, setCaption] = useState('');
	const [uploading, setUploading] = useState(false);

	const pickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') {
			Alert.alert('Permission required', 'You need to grant media library permission to select images.');
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			quality: 0.8,
		});
		if (!result.canceled && result.assets && result.assets.length > 0) {
			setImage(result.assets[0].uri);
		}
	};

	const uploadImage = async () => {
		if (!image) return;
		setUploading(true);
		try {
			const { data: { user }, error: userError } = await supabase.auth.getUser();
			if (!user) {
				Alert.alert('Not logged in', 'Please log in before uploading.');
				setUploading(false);
				return;
			}

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

			// Insert post into DB
			const { error: dbError } = await supabase.from('posts').insert([
				{
					user_id: user.id,
					media_urls: [mediaUrl],
					media_type: 'image',
					caption,
				},
			]);
			if (dbError) throw dbError;
			Alert.alert('Success', 'Image uploaded and post created!');
			setImage(null);
			setCaption('');
		} catch (e: any) {
			Alert.alert('Upload failed', e.message);
		} finally {
			setUploading(false);
		}
	};

	return (
		<View style={styles.container}>
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
			/>
			<TouchableOpacity onPressIn={uploadImage} disabled={!image || uploading} style={styles.button}>
				<Text style={styles.buttonText}>{uploading ? 'Uploading...' : 'Upload'}</Text>
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
