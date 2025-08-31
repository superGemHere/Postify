

import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface Post {
	id: string;
	user_id: string;
	media_url: string;
	media_type: string;
	caption: string;
	created_at: string;
}
interface Like {
	id: string;
	post_id: string;
	user_id: string;
	created_at: string;
}
interface Comment {
	id: string;
	post_id: string;
	user_id: string;
	content: string;
	created_at: string;
	parent_id?: string | null;
	replies?: Comment[];
}

export default function FeedScreen() {
	const [posts, setPosts] = useState<Post[]>([]);
	const [likes, setLikes] = useState<{ [postId: string]: Like[] }>({});
	const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

	const user = useAuthStore(state => state.user);
	const [userMap, setUserMap] = useState<{ [id: string]: { username: string; email: string } }>({});

	// Fetch userMap from profiles table
	const fetchUserMap = async (userIds: string[]) => {
		if (userIds.length === 0) return;
		const uniqueIds = Array.from(new Set(userIds));
		const { data, error } = await supabase
			.from('profiles')
			.select('id, username, email')
			.in('id', uniqueIds);
		if (!error && data) {
			const map: { [id: string]: { username: string; email: string } } = {};
			data.forEach((u: any) => {
				map[u.id] = { username: u.username || u.email || u.id, email: u.email };
			});
			setUserMap(prev => ({ ...prev, ...map }));
		}
	};


	const fetchPosts = async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from('posts')
			.select('*')
			.order('created_at', { ascending: false });
		if (!error && data) {
			setPosts(data as Post[]);
			// Fetch userMap for post authors
			const postUserIds = (data as Post[]).map(p => p.user_id);
			fetchUserMap(postUserIds);
		}
		setLoading(false);
	};

	const fetchLikes = async (postId: string) => {
		const { data, error } = await supabase
			.from('likes')
			.select('*')
			.eq('post_id', postId);
		if (!error && data) {
			setLikes(prev => ({ ...prev, [postId]: data as Like[] }));
		}
	};

	const fetchComments = async (postId: string) => {
		const { data, error } = await supabase
			.from('comments')
			.select('*')
			.eq('post_id', postId)
			.order('created_at', { ascending: true });
		if (!error && data) {
			// Build nested replies
			const commentMap: { [id: string]: Comment } = {};
			const rootComments: Comment[] = [];
			(data as Comment[]).forEach(comment => {
				comment.replies = [];
				commentMap[comment.id] = comment;
			});
			(data as Comment[]).forEach(comment => {
				if (comment.parent_id && commentMap[comment.parent_id]) {
					commentMap[comment.parent_id].replies!.push(comment);
				} else {
					rootComments.push(comment);
				}
			});
			setComments(prev => ({ ...prev, [postId]: rootComments }));
			// Fetch userMap for comment authors
			const commentUserIds = (data as Comment[]).map((c: any) => c.user_id);
			fetchUserMap(commentUserIds);
		}
	};

	useEffect(() => {
		fetchPosts();
	}, []);

	useEffect(() => {
		posts.forEach(post => {
			fetchLikes(post.id);
			fetchComments(post.id);
		});
	}, [posts]);

	const onRefresh = async () => {
		setRefreshing(true);
		await fetchPosts();
		setRefreshing(false);
	};

	// ...existing code...


		const handleLike = async (postId: string) => {
			if (!user) return;
			const user_id = user.id;
			const alreadyLiked = likes[postId]?.some(like => like.user_id === user_id);
			if (alreadyLiked) {
				// Dislike (remove like)
				const like = likes[postId]?.find(like => like.user_id === user_id);
				if (like) {
					const { error } = await supabase.from('likes').delete().eq('id', like.id);
					if (!error) fetchLikes(postId);
				}
				return;
			}
			// Like
			const { error } = await supabase.from('likes').insert([{ post_id: postId, user_id }]);
			if (!error) fetchLikes(postId);
		};

		const handleAddComment = async (postId: string, parentId?: string) => {
			if (!user) return;
			const user_id = user.id;
			const content = commentInputs[postId]?.trim();
			if (!content) return;
			const { error } = await supabase.from('comments').insert([
				{ post_id: postId, user_id, content, parent_id: parentId || null },
			]);
			if (!error) {
				fetchComments(postId);
				setCommentInputs(inputs => ({ ...inputs, [postId]: '' }));
			}
		};

	const renderComments = (commentsArr: Comment[], postId: string, level = 0) => {
		return commentsArr.map(comment => {
			const displayName = userMap[comment.user_id]?.username || comment.user_id;
			return (
				<View key={comment.id} style={[styles.comment, { marginLeft: level * 20 }]}> 
					<Text style={styles.commentUser}>{displayName}</Text>
					<Text style={styles.commentContent}>{comment.content}</Text>
					<TouchableOpacity style={styles.replyBtn} onPress={() => setCommentInputs(inputs => ({ ...inputs, [postId]: `@${displayName} ` }))}>
						<Text style={styles.replyText}>Reply</Text>
					</TouchableOpacity>
					{comment.replies && comment.replies.length > 0 && renderComments(comment.replies, postId, level + 1)}
				</View>
			);
		});
	};

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#007bff" />
			</View>
		);
	}

	return (
		<ScrollView
			style={styles.container}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
		>
			<Text style={styles.header}>Feed</Text>
			{posts.length === 0 && (
				<Text style={styles.empty}>No posts yet.</Text>
			)}
			{posts.map(post => (
				<View key={post.id} style={styles.card}>
					<View style={styles.cardHeader}>
						<Image source={{ uri: 'https://i.pravatar.cc/40?u=' + post.user_id }} style={styles.avatar} />
						<Text style={styles.username}>{userMap[post.user_id]?.username || post.user_id}</Text>
					</View>
					{post.media_url ? (
						<Image source={{ uri: post.media_url }} style={styles.image} resizeMode="cover" />
					) : null}
					<View style={styles.actionsRow}>
						<TouchableOpacity onPress={() => handleLike(post.id)}>
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
						<View style={styles.addCommentRow}>
							<TextInput
								style={styles.commentInput}
								placeholder="Add a comment..."
								value={commentInputs[post.id] || ''}
								onChangeText={text => setCommentInputs(inputs => ({ ...inputs, [post.id]: text }))}
							/>
							<TouchableOpacity onPress={() => handleAddComment(post.id)}>
								<Text style={styles.postCommentBtn}>Post</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			))}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		paddingHorizontal: 0,
	},
	header: {
		fontSize: 24,
		fontWeight: 'bold',
		marginVertical: 20,
		textAlign: 'center',
	},
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
	image: {
		width: '100%',
		height: 320,
		borderRadius: 8,
		marginBottom: 8,
		backgroundColor: '#ddd',
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
	empty: {
		textAlign: 'center',
		color: '#888',
		marginTop: 40,
		fontSize: 16,
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
});
