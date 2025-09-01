import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { usePostStore, Post, Like, Comment } from '../../store/postStore';
import PostCard from '@/components/PostCard';

export default function FeedScreen() {
	const posts = usePostStore(state => state.posts);
	const setPosts = usePostStore(state => state.setPosts);
	const likes = usePostStore(state => state.likes);
	const addLikeOrToggle = usePostStore(state => state.addLikeOrToggle);
	const comments = usePostStore(state => state.comments);
	const addComment = usePostStore(state => state.addComment);
const replaceComment = usePostStore(state => state.replaceComment);
	const setLikes = usePostStore(state => state.setLikes);
	const setComments = usePostStore(state => state.setComments);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
	const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

	const [replyingTo, setReplyingTo] = useState<{ [postId: string]: string | null }>({});

	const user = useAuthStore(state => state.user);
	const [userMap, setUserMap] = useState<{ [id: string]: { username: string; email: string } }>({});

	const POSTS_PER_PAGE = 20;

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


	const fetchPosts = async (isLoadMore = false) => {
		if (isLoadMore) {
			setLoadingMore(true);
		} else {
			setLoading(true);
		}
		
		const offset = isLoadMore ? posts.length : 0;
		const { data, error } = await supabase
			.from('posts')
			.select('*')
			.order('created_at', { ascending: false })
			.range(offset, offset + POSTS_PER_PAGE - 1);
			
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
			
			if (isLoadMore) {
				setPosts([...posts, ...postsWithArray]);
			} else {
				setPosts(postsWithArray as Post[]);
			}
			
			// Check if there are more posts
			setHasMore(data.length === POSTS_PER_PAGE);
			
			// Fetch userMap for post authors
			const postUserIds = postsWithArray.map(p => p.user_id);
			const postIds = postsWithArray.map(p => p.id);
			
			await Promise.all([
				fetchUserMap(postUserIds),
				fetchAllLikes(postIds),
				fetchAllComments(postIds)
			]);
		}
		
		if (isLoadMore) {
			setLoadingMore(false);
		} else {
			setLoading(false);
		}
	};

	const fetchAllLikes = async (postIds: string[]) => {
		if (postIds.length === 0) return;
		const { data, error } = await supabase
			.from('likes')
			.select('*')
			.in('post_id', postIds);
		if (!error && data) {
			// Group likes by post_id
			const likesByPost: { [postId: string]: Like[] } = {};
			(data as Like[]).forEach(like => {
				if (!likesByPost[like.post_id]) {
					likesByPost[like.post_id] = [];
				}
				likesByPost[like.post_id].push(like);
			});
			// Set all likes at once
			Object.entries(likesByPost).forEach(([postId, likes]) => {
				setLikes(postId, likes);
			});
		}
	};

	const fetchAllComments = async (postIds: string[]) => {
		if (postIds.length === 0) return;
		const { data, error } = await supabase
			.from('comments')
			.select('*')
			.in('post_id', postIds)
			.order('created_at', { ascending: true });
		if (!error && data) {
			// Group comments by post_id and build nested structure
			const commentsByPost: { [postId: string]: Comment[] } = {};
			
			// Build nested replies for each post
			const postIdsFromComments = [...new Set((data as Comment[]).map(c => c.post_id))];
			postIdsFromComments.forEach(postId => {
				const postComments = (data as Comment[]).filter(c => c.post_id === postId);
				const commentMap: { [id: string]: Comment } = {};
				const rootComments: Comment[] = [];
				
				postComments.forEach(comment => {
					comment.replies = [];
					commentMap[comment.id] = comment;
				});
				
				postComments.forEach(comment => {
					if (comment.parent_id && commentMap[comment.parent_id]) {
						commentMap[comment.parent_id].replies!.push(comment);
					} else {
						rootComments.push(comment);
					}
				});
				
				commentsByPost[postId] = rootComments;
			});
			
			// Set all comments at once
			Object.entries(commentsByPost).forEach(([postId, comments]) => {
				setComments(postId, comments);
			});
			
			// Fetch userMap for comment authors
			const commentUserIds = (data as Comment[]).map((c: any) => c.user_id);
			fetchUserMap(commentUserIds);
		}
	};

	const fetchLikes = async (postId: string) => {
		const { data, error } = await supabase
			.from('likes')
			.select('*')
			.eq('post_id', postId);
		if (!error && data) {
			setLikes(postId, data as Like[]);
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
			setComments(postId, rootComments);
		}
	};

	useEffect(() => {
		fetchPosts();
	}, []);

	const onRefresh = async () => {
		setRefreshing(true);
		setHasMore(true);
		await fetchPosts();
		setRefreshing(false);
	};

	const loadMore = () => {
		if (!loadingMore && hasMore) {
			fetchPosts(true);
		}
	};

	const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
		const visiblePostIds = new Set<string>(
			viewableItems
				.filter((item: any) => item.item.media_type === 'video')
				.map((item: any) => item.item.id as string)
		);
		setVisibleItems(visiblePostIds);
	}, []);

	const viewabilityConfig = {
		itemVisiblePercentThreshold: 50, // 50% of the item must be visible
	};

	const renderPost = ({ item }: { item: Post }) => (
		<PostCard
			key={item.id}
			user={user}
			post={item}
			isVisible={visibleItems.has(item.id)}
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
	);

	const renderFooter = () => {
		if (!loadingMore) return null;
		return (
			<View style={styles.loadingMore}>
				<ActivityIndicator size="small" color="#007bff" />
			</View>
		);
	};

	const renderHeader = () => (
		<View>
			{posts.length === 0 && (
				<Text style={styles.empty}>No posts yet.</Text>
			)}
		</View>
	);



const handleLike = async (postId: string) => {
    if (!user) return;
    const user_id = user.id;
    const alreadyLiked = likes[postId]?.some(like => like.user_id === user_id);
    
    if (alreadyLiked) {
        // Unlike: remove from local state first
        addLikeOrToggle(postId, undefined, user_id);
        // Remove like from Supabase
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user_id);
    } else {
        // Like: add to local state first
        const newLike = {
            id: Math.random().toString(36).slice(2),
            post_id: postId,
            user_id,
            created_at: new Date().toISOString(),
        };
        addLikeOrToggle(postId, newLike, user_id);
        // Add like to Supabase
        await supabase.from('likes').insert([{ post_id: postId, user_id }]);
    }
};		const handleAddComment = async (postId: string) => {
			if (!user) return;
			const user_id = user.id;
			const content = commentInputs[postId]?.trim();
			if (!content) return;

			const parent_id = replyingTo[postId] || null;
			
			// Optimistic update first for instant UI
			const tempId = Math.random().toString(36).slice(2);
			const tempComment = {
				id: tempId,
				post_id: postId,
				user_id,
				content,
				parent_id,
				created_at: new Date().toISOString(),
				replies: [],
			};
			addComment(postId, tempComment);
			setCommentInputs(inputs => ({ ...inputs, [postId]: '' }));
			setReplyingTo(inputs => ({ ...inputs, [postId]: null }));
			
			// Then sync with database in background
			const { data, error } = await supabase.from('comments').insert([
				{ post_id: postId, user_id, content, parent_id },
			]).select();
			
			if (!error && data && data.length > 0) {
				// Replace temp comment with real one
				const realComment = {
					...data[0],
					replies: [],
				};
				replaceComment(postId, tempId, realComment);
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
		<FlatList
			data={posts}
			renderItem={renderPost}
			keyExtractor={(item) => item.id}
			style={styles.container}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
			onEndReached={loadMore}
			onEndReachedThreshold={0.1}
			onViewableItemsChanged={onViewableItemsChanged}
			viewabilityConfig={viewabilityConfig}
			ListHeaderComponent={renderHeader}
			ListFooterComponent={renderFooter}
		/>
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
	loadingMore: {
		padding: 20,
		alignItems: 'center',
	},
});
