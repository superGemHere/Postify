
import React from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import PostCarousel from './PostCarousel';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Post, Like, Comment } from '../types/Post';

interface PostCardProps {
	user: any;
	post: Post;
	userMap: { [id: string]: { username: string; email: string } };
	renderComments: (commentsArr: Comment[], postId: string) => React.ReactNode;
	likes: { [postId: string]: Like[] };
	comments: { [postId: string]: Comment[] };
	handleLike: (postId: string) => void;
	handleAddComment: (postId: string) => void;
	commentInputs: { [postId: string]: string };
	setCommentInputs: React.Dispatch<React.SetStateAction<{ [postId: string]: string }>>;
	replyingTo: { [postId: string]: string | null };
	setReplyingTo: React.Dispatch<React.SetStateAction<{ [postId: string]: string | null }>>;
}

const PostCard: React.FC<PostCardProps> = ({
	user,
	post,
	userMap,
	renderComments,
	likes,
	comments,
	handleLike,
	handleAddComment,
	commentInputs,
	setCommentInputs,
	replyingTo,
	setReplyingTo,
}) => {

   const videoPlayer = post.media_type === 'video' && post.media_urls?.[0]
		? useVideoPlayer(post.media_urls[0], (p: any) => { if (p) p.loop = true; })
		: null;

	return (
		<View style={styles.card}>
			<View style={styles.cardHeader}>
				<Image source={{ uri: 'https://i.pravatar.cc/40?u=' + post.user_id }} style={styles.avatar} />
				<Text style={styles.username}>{userMap[post.user_id]?.username || post.user_id}</Text>
			</View>
			{post.media_type === 'video' && post.media_urls && post.media_urls.length > 0 && videoPlayer ? (
				<VideoView
					player={videoPlayer}
					style={{ width: '100%', height: 320, borderRadius: 8, marginBottom: 8, backgroundColor: '#000' }}
					allowsFullscreen
					allowsPictureInPicture
				/>
			) : post.media_type === 'image' && post.media_urls && post.media_urls.length > 0 ? (
				<PostCarousel images={post.media_urls} />
			) : null}
			<View style={styles.actionsRow}>
				<TouchableOpacity onPressIn={() => handleLike(post.id)}>
					<Text style={styles.likeBtn}>
						{user && likes[post.id]?.some(like => like.user_id === user.id) ? '❤️' : '🤍'}
					</Text>
				</TouchableOpacity>
				<Text style={styles.likesCount}>{likes[post.id]?.length || 0} likes</Text>
			</View>
			<Text style={styles.caption}><Text style={styles.username}>{userMap[post.user_id]?.username || post.user_id}</Text> {post.caption}</Text>
			<Text style={styles.meta}>{new Date(post.created_at).toLocaleString()}</Text>
			<View style={styles.commentsSection}>
				{comments[post.id] && renderComments(comments[post.id], post.id)}
				{/* Only show the add comment row if not replying to a comment */}
				{(!replyingTo[post.id]) && (
					<View style={styles.addCommentRow}>
						<TextInput
							style={styles.commentInput}
							placeholder="Add a comment..."
							value={commentInputs[post.id] || ''}
							onChangeText={text => setCommentInputs(inputs => ({ ...inputs, [post.id]: text }))}
						/>
						<TouchableOpacity onPressIn={() => handleAddComment(post.id)}>
							<Text style={styles.postCommentBtn}>Post</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		</View>
	);
};

export default PostCard;

const styles = StyleSheet.create({
   card: {
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
		marginBottom: 0,
		paddingBottom: 16,
		paddingTop: 8,
		paddingHorizontal: 12,
	},
   cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		marginRight: 10,
		backgroundColor: '#eee',
	},
	username: {
		fontWeight: 'bold',
		fontSize: 15,
		color: '#222',
	},
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
		gap: 8,
	},
	likeBtn: {
		fontSize: 24,
		color: '#e74c3c',
		marginRight: 8,
	},
	likesCount: {
		fontSize: 14,
		color: '#222',
	},
	caption: {
		fontSize: 15,
		marginBottom: 4,
		color: '#222',
	},
	meta: {
		fontSize: 12,
		color: '#888',
		marginBottom: 8,
	},
	commentsSection: {
		marginTop: 4,
		marginBottom: 8,
	},
	comment: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 2,
		gap: 4,
	},
	commentUser: {
		fontWeight: 'bold',
		fontSize: 13,
		color: '#222',
		marginRight: 4,
	},
	commentContent: {
		fontSize: 13,
		color: '#222',
		flex: 1,
	},
	replyBtn: {
		marginLeft: 8,
	},
	replyText: {
		color: '#007bff',
		fontSize: 12,
	},
	addCommentRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		gap: 6,
	},
	commentInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#eee',
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 6,
		fontSize: 14,
		backgroundColor: '#fafafa',
	},
	postCommentBtn: {
		color: '#007bff',
		fontWeight: 'bold',
		fontSize: 14,
		marginLeft: 6,
	},
})