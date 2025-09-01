

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import PostCard from '@/components/PostCard';
import { Post, Like, Comment } from '@/types/Post';

export default function FeedScreen() {
	const [posts, setPosts] = useState<Post[]>([]);
	const [likes, setLikes] = useState<{ [postId: string]: Like[] }>({});
	const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

	const [replyingTo, setReplyingTo] = useState<{ [postId: string]: string | null }>({});

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
			// Ensure media_urls is always an array
			const postsWithArray = (data as any[]).map(post => ({
				...post,
				media_urls: Array.isArray(post.media_urls)
					? post.media_urls
					: post.media_url
						? [post.media_url]
						: [],
			}));
			setPosts(postsWithArray as Post[]);
			// Fetch userMap for post authors
			const postUserIds = postsWithArray.map(p => p.user_id);
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

		const handleAddComment = async (postId: string) => {
			if (!user) return;
			const user_id = user.id;
			const content = commentInputs[postId]?.trim();
			if (!content) return;

			const parent_id = replyingTo[postId] || null;
			const { error } = await supabase.from('comments').insert([
				{ post_id: postId, user_id, content, parent_id },
			]);
			if (!error) {
				fetchComments(postId);
				setCommentInputs(inputs => ({ ...inputs, [postId]: '' }));
				setReplyingTo(inputs => ({ ...inputs, [postId]: null }));
			}
		};

	const renderComments = (commentsArr: Comment[], postId: string) => {
		return commentsArr.map(comment => {
			const displayName = userMap[comment.user_id]?.username || comment.user_id;
			const isReplying = replyingTo[postId] === comment.id;
			return (
				<View key={comment.id} style={{ marginBottom: 4 }}>
					<View style={styles.comment}>
						<Text style={styles.commentUser}>{displayName}</Text>
						<Text style={styles.commentContent}>{comment.content}</Text>
						<TouchableOpacity
							style={styles.replyBtn}
							onPress={() => {
								setReplyingTo(inputs => ({ ...inputs, [postId]: comment.id }));
								setCommentInputs(inputs => ({ ...inputs, [postId]: `@${displayName} ` }));
							}}
						>
							<Text style={styles.replyText}>Reply</Text>
						</TouchableOpacity>
					</View>

					{isReplying && (
						<View style={[styles.addCommentRow, { marginLeft: 20, marginBottom: 4 }]}> 
							<TextInput
								style={styles.commentInput}
								placeholder={`Reply to @${displayName}...`}
								value={commentInputs[postId] || ''}
								onChangeText={text => setCommentInputs(inputs => ({ ...inputs, [postId]: text }))}
								autoFocus
							/>
							<TouchableOpacity onPress={() => handleAddComment(postId)}>
								<Text style={styles.postCommentBtn}>Post</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => setReplyingTo(inputs => ({ ...inputs, [postId]: null }))}>
								<Text style={{ color: '#888', marginLeft: 4 }}>Cancel</Text>
							</TouchableOpacity>
						</View>
					)}

					{comment.replies && comment.replies.length > 0 && (
						<View style={styles.repliesContainer}>
							{comment.replies.map((reply, idx) => {
								const replyName = userMap[reply.user_id]?.username || reply.user_id;
								return (
									<View key={reply.id || `${comment.id}-reply-${idx}`} style={[styles.comment, styles.replyItem]}>
										<Text style={styles.commentUser}>{replyName}</Text>
										<Text style={styles.commentContent}>{reply.content}</Text>
									</View>
								);
							})}
						</View>
					)}
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
				<PostCard
					key={post.id}
					user={user}
					post={post}
					userMap={userMap}
					renderComments={renderComments}
					likes={likes}
					comments={comments}
					handleLike={handleLike}
					handleAddComment={handleAddComment}
					commentInputs={commentInputs}
					setCommentInputs={setCommentInputs}
					replyingTo={replyingTo}
					setReplyingTo={setReplyingTo}
				/>
			))}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	repliesContainer: {
		marginLeft: 20,
		marginTop: 2,
		marginBottom: 2,
		gap: 2,
	},
	replyItem: {
		backgroundColor: '#f5f5f5',
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
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
