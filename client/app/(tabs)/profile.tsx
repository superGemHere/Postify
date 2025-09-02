import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, ScrollView, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { usePostStore } from '../../store/postStore';
import { Post, Like, Comment } from '../../types/Post';
import PostCard from '@/components/PostCard';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function ProfileScreen() {
	const user = useAuthStore(state => state.user);
	const posts = usePostStore(state => state.posts);
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
	const [isScreenFocused, setIsScreenFocused] = useState(true);
	const [userPosts, setUserPosts] = useState<Post[]>([]);
	const [userProfile, setUserProfile] = useState<{ username: string; email: string; post_count: number; avatar_url?: string } | null>(null);
	const [replyingTo, setReplyingTo] = useState<{ [postId: string]: string | null }>({});

	const [userMap, setUserMap] = useState<{ [id: string]: { username: string; email: string; avatar_url?: string } }>({});

	// Get posts from global store that belong to current user (for newly uploaded posts)
	const globalUserPosts = posts.filter(post => post.user_id === user?.id);

	// Combine posts from database fetch and global store, removing duplicates
	const combinedUserPosts = React.useMemo(() => {
		const allPosts = [...userPosts, ...globalUserPosts];
		const uniquePosts = allPosts.reduce((acc, post) => {
			if (!acc.find(p => p.id === post.id)) {
				acc.push(post);
			}
			return acc;
		}, [] as Post[]);
		return uniquePosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
	}, [userPosts, globalUserPosts]);

	const POSTS_PER_PAGE = 20;

	const fetchUserProfile = async () => {
		if (!user) return;
		
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('username, email, avatar_url')
			.eq('id', user.id)
			.single();
			
		// counting user posts
		const { count, error: countError } = await supabase
			.from('posts')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id);
			
		if (!profileError && profile) {
			setUserProfile({
				username: profile.username || profile.email || user.email,
				email: profile.email || user.email,
				post_count: count || 0,
				avatar_url: profile.avatar_url
			});
		}
	};

	const fetchUserPosts = async (isLoadMore = false) => {
		if (!user) return;
		
		if (isLoadMore) {
			setLoadingMore(true);
		} else {
			setLoading(true);
		}
		
		const offset = isLoadMore ? userPosts.length : 0;
		const { data, error } = await supabase
			.from('posts')
			.select('*')
			.eq('user_id', user.id) 
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
			
			const postIds = postsWithArray.map(p => p.id);
			const postUserIds = postsWithArray.map(p => p.user_id);
			
			// Fetch comments and likes concurrently, then process everything
			const [commentsResult, likesResult] = await Promise.all([
				supabase
					.from('comments')
					.select('*')
					.in('post_id', postIds)
					.order('created_at', { ascending: true }),
				supabase
					.from('likes')
					.select('*')
					.in('post_id', postIds)
			]);
			
			const commentUserIds = commentsResult.data ? (commentsResult.data as Comment[]).map((c: any) => c.user_id) : [];
			const allUserIds = [...new Set([...postUserIds, ...commentUserIds])];
			
			await Promise.all([
				fetchUserMap(allUserIds),
				(async () => {
					if (!likesResult.error && likesResult.data) {
						const likesByPost: { [postId: string]: Like[] } = {};
						(likesResult.data as Like[]).forEach(like => {
							if (!likesByPost[like.post_id]) {
								likesByPost[like.post_id] = [];
							}
							likesByPost[like.post_id].push(like);
						});
						Object.entries(likesByPost).forEach(([postId, likes]) => {
							setLikes(postId, likes);
						});
					}
				})(),
				(async () => {
					if (!commentsResult.error && commentsResult.data) {
						processCommentsData(commentsResult.data as Comment[], postIds);
					}
				})()
			]);
			
			if (isLoadMore) {
				// For load more, append to existing local user posts
				setUserPosts([...userPosts, ...postsWithArray]);
			} else {
				// For initial load, set the local user posts
				setUserPosts(postsWithArray as Post[]);
			}
			
			// Check if there are more posts
			setHasMore(data.length === POSTS_PER_PAGE);
		}
		
		if (isLoadMore) {
			setLoadingMore(false);
		} else {
			setLoading(false);
		}
	};

	const processCommentsData = (commentsData: Comment[], postIds: string[]) => {
		// Group comments by post_id and build nested structure
		const commentsByPost: { [postId: string]: Comment[] } = {};
		
		// Build nested replies for each post
		const postIdsFromComments = [...new Set(commentsData.map(c => c.post_id))];
		postIdsFromComments.forEach(postId => {
			const postComments = commentsData.filter(c => c.post_id === postId);
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
	};

	const fetchUserMap = async (userIds: string[]) => {
		if (userIds.length === 0) return;
		const uniqueIds = Array.from(new Set(userIds));
		const { data, error } = await supabase
			.from('profiles')
			.select('id, username, email, avatar_url')
			.in('id', uniqueIds);
		if (!error && data) {
			const map: { [id: string]: { username: string; email: string; avatar_url?: string } } = {};
			data.forEach((u: any) => {
				map[u.id] = { 
					username: u.username || u.email || u.id, 
					email: u.email,
					avatar_url: u.avatar_url
				};
			});
			setUserMap(prev => ({ ...prev, ...map }));
		}
	};

	useEffect(() => {
		if (user) {
			fetchUserProfile();
			fetchUserPosts();
		}
	}, [user]);

	// Handle screen focus/blur for video management
	useFocusEffect(
		useCallback(() => {
			setIsScreenFocused(true);
			return () => {
				setIsScreenFocused(false);
				// Clear visible items when screen loses focus to pause all videos
				setVisibleItems(new Set());
			};
		}, [])
	);

	// Effect to update post count when posts change
	useEffect(() => {
		if (user && userProfile) {
			const currentUserPostCount = combinedUserPosts.length;
			if (currentUserPostCount !== userProfile.post_count) {
				setUserProfile(prev => prev ? { ...prev, post_count: currentUserPostCount } : prev);
			}
		}
	}, [combinedUserPosts, user, userProfile]);

	const onRefresh = async () => {
		setRefreshing(true);
		setHasMore(true);
		await Promise.all([
			fetchUserProfile(),
			fetchUserPosts()
		]);
		setRefreshing(false);
	};

	const loadMore = () => {
		if (!loadingMore && hasMore) {
			fetchUserPosts(true);
		}
	};

	const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
		// Only allow video playback if screen is focused
		if (!isScreenFocused) {
			setVisibleItems(new Set());
			return;
		}
		
		const visiblePostIds = new Set<string>(
			viewableItems
				.filter((item: any) => item.item.media_type === 'video')
				.map((item: any) => item.item.id as string)
		);
		setVisibleItems(visiblePostIds);
	}, [isScreenFocused]);

	const viewabilityConfig = {
		itemVisiblePercentThreshold: 50,
	};

	const handleLike = async (postId: string) => {
		if (!user) return;
		const user_id = user.id;
		const alreadyLiked = likes[postId]?.some(like => like.user_id === user_id);
		
		if (alreadyLiked) {
			addLikeOrToggle(postId, undefined, user_id);
			await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user_id);
		} else {
			const newLike = {
				id: Math.random().toString(36).slice(2),
				post_id: postId,
				user_id,
				created_at: new Date().toISOString(),
			};
			addLikeOrToggle(postId, newLike, user_id);
			await supabase.from('likes').insert([{ post_id: postId, user_id }]);
		}
	};

	const handleAddComment = async (postId: string) => {
		if (!user) return;
		const user_id = user.id;
		const content = commentInputs[postId]?.trim();
		if (!content) return;

		const parent_id = replyingTo[postId] || null;
		
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
			
			// Ensure user data is fetched for the comment author
			if (!userMap[user_id]) {
				fetchUserMap([user_id]);
			}
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

	const renderPost = ({ item }: { item: Post }) => (
		<PostCard
			key={item.id}
			user={user}
			post={item}
			isVisible={visibleItems.has(item.id) && isScreenFocused}
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
		<View style={styles.profileHeader}>
			{userProfile && (
				<>
					<View style={styles.profileInfo}>
						<View style={styles.avatar}>
							{userProfile.avatar_url ? (
								<Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} />
							) : (
								<IconSymbol name="person.fill" size={40} color="#999" />
							)}
						</View>
						<View style={styles.userDetails}>
							<Text style={styles.username}>{userProfile.username}</Text>
							<Text style={styles.email}>{userProfile.email}</Text>
						</View>
					</View>
					<View style={styles.statsContainer}>
						<View style={styles.statItem}>
							<Text style={styles.statNumber}>{combinedUserPosts.length}</Text>
							<Text style={styles.statLabel}>Posts</Text>
						</View>
						<View style={styles.statItem}>
							<Text style={styles.statNumber}>{combinedUserPosts.reduce((total, post) => total + (likes[post.id]?.length || 0), 0)}</Text>
							<Text style={styles.statLabel}>Likes</Text>
						</View>
						<View style={styles.statItem}>
							<Text style={styles.statNumber}>{combinedUserPosts.reduce((total, post) => total + (comments[post.id]?.length || 0), 0)}</Text>
							<Text style={styles.statLabel}>Comments</Text>
						</View>
					</View>
					<View style={styles.divider} />
				</>
			)}
			{combinedUserPosts.length === 0 && !loading && (
				<Text style={styles.empty}>No posts yet. Start sharing your moments!</Text>
			)}
		</View>
	);

	if (!user) {
		return (
			<View style={styles.centered}>
				<IconSymbol name="person.circle" size={60} color="#ccc" />
				<Text style={styles.notLoggedIn}>Please log in to view your profile</Text>
			</View>
		);
	}

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#007bff" />
			</View>
		);
	}

	return (
		<FlatList
			data={combinedUserPosts}
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
}

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
	profileHeader: {
		padding: 20,
		backgroundColor: '#fff',
	},
	profileInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#f0f0f0',
		marginRight: 16,
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatarImage: {
		width: 80,
		height: 80,
		borderRadius: 40,
	},
	userDetails: {
		flex: 1,
	},
	username: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#222',
		marginBottom: 4,
	},
	email: {
		fontSize: 16,
		color: '#666',
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 20,
	},
	statItem: {
		alignItems: 'center',
	},
	statNumber: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#222',
	},
	statLabel: {
		fontSize: 14,
		color: '#666',
		marginTop: 4,
	},
	divider: {
		height: 1,
		backgroundColor: '#eee',
		marginTop: 10,
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
	notLoggedIn: {
		textAlign: 'center',
		color: '#888',
		marginTop: 20,
		fontSize: 18,
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
