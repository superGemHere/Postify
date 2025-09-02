import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { usePostStore } from '../../store/postStore';
import { useAuthStore } from '../../store/authStore';

export default function UploadTextScreen() {
	const [text, setText] = useState('');
	const [uploading, setUploading] = useState(false);
	
	const addPost = usePostStore(state => state.addPost);
	const removePost = usePostStore(state => state.removePost);
	const replacePost = usePostStore(state => state.replacePost);
	const user = useAuthStore(state => state.user);

	const uploadTextPost = async () => {
		if (!text.trim() || !user) return;
		setUploading(true);
		
		// Create temporary post for optimistic update
		const tempId = Math.random().toString(36).slice(2);
		const tempPost = {
			id: tempId,
			user_id: user.id,
			media_urls: [], 
			media_type: 'text',
			caption: text.trim(),
			created_at: new Date().toISOString(),
		};
		
		addPost(tempPost);
		
		try {

			const { data: dbData, error: dbError } = await supabase.from('posts').insert([
				{
					user_id: user.id,
					media_urls: [],
					media_type: 'text',
					caption: text.trim(),
				},
			]).select();
			
			if (dbError) throw dbError;
			
			if (dbData && dbData.length > 0) {

				const realPost = {
					...dbData[0],
					media_urls: Array.isArray(dbData[0].media_urls) 
						? dbData[0].media_urls 
						: [],
				};
				replacePost(tempId, realPost);
			}
			
			Alert.alert('Success', 'Text post created!');
			setText('');
		} catch (e: any) {
			Alert.alert('Upload failed', e.message);
			removePost(tempId);
		} finally {
			setUploading(false);
		}
	};

	const charCount = text.length;
	const maxChars = 280; //Added twitters character limit, just for fun xD

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
				<Text style={styles.title}>What's on your mind?</Text>
				
				<View style={styles.textContainer}>
					<TextInput
						style={styles.textInput}
						placeholder="Share your thoughts..."
						value={text}
						onChangeText={setText}
						multiline
						maxLength={maxChars}
						textAlignVertical="top"
						autoFocus
					/>
					<View style={styles.charCountContainer}>
						<Text style={[
							styles.charCount, 
							charCount > maxChars * 0.9 && styles.charCountWarning,
							charCount >= maxChars && styles.charCountError
						]}>
							{charCount}/{maxChars}
						</Text>
					</View>
				</View>

				<TouchableOpacity 
					onPress={uploadTextPost} 
					disabled={!text.trim() || uploading || charCount > maxChars} 
					style={[
						styles.button,
						(!text.trim() || uploading || charCount > maxChars) && styles.buttonDisabled
					]}
				>
					<Text style={[
						styles.buttonText,
						(!text.trim() || uploading || charCount > maxChars) && styles.buttonTextDisabled
					]}>
						{uploading ? 'Posting...' : 'Post'}
					</Text>
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
		padding: 20,
		gap: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#222',
		textAlign: 'center',
		marginBottom: 10,
	},
	textContainer: {
		flex: 1,
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#e9ecef',
		minHeight: 200,
	},
	textInput: {
		flex: 1,
		fontSize: 18,
		color: '#222',
		lineHeight: 24,
		textAlignVertical: 'top',
		fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
	},
	charCountContainer: {
		alignItems: 'flex-end',
		marginTop: 10,
	},
	charCount: {
		fontSize: 14,
		color: '#6c757d',
	},
	charCountWarning: {
		color: '#ffc107',
	},
	charCountError: {
		color: '#dc3545',
	},
	button: {
		backgroundColor: '#1da1f2',
		paddingVertical: 16,
		paddingHorizontal: 32,
		borderRadius: 25,
		alignItems: 'center',
		marginTop: 20,
	},
	buttonDisabled: {
		backgroundColor: '#adb5bd',
	},
	buttonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 18,
	},
	buttonTextDisabled: {
		color: '#6c757d',
	},
});
