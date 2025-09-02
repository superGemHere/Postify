# Postify

A modern social media mobile application for sharing photos, videos, and text posts, built with React Native, Expo, and Supabase. Features Instagram-like functionality with optimistic updates, infinite scroll, video autoplay, user avatars, and comprehensive floating bubble menu for media uploads.

## 🚀 Features

- **Multi-media Posts**: Upload single/multiple photos, videos, and text-only posts
- **Text Posts**: Create text-only posts with character limit
- **Profile Avatars**: Required avatar upload during user registration
- **User Profiles**: Dedicated profile screen showing user's posts, avatar, and statistics
- **Real-time Feed**: Infinite scroll with pagination (20 posts per page)
- **Interactive Engagement**: Like posts and threaded comments with replies
- **Video Autoplay**: Videos automatically play when in view, pause when out of view
- **Tab-aware Video Management**: Videos pause when switching between tabs to conserve battery
- **Optimistic Updates**: Instant UI updates for likes, comments, and posts
- **Authentication**: Email/password auth with email confirmation and mandatory avatar upload
- **Performance Optimized**: Parallel data fetching with Promise.all for faster loading
- **Floating Bubble Menu**: Radial upload menu with smooth animations and touch handling
- **Navigation Modals**: Upload screens presented as modals with proper back navigation
- **Responsive UI**: Modern design with smooth animations and carousels

## 📋 Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android)
- Supabase account

## 🛠️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/superGemHere/Postify.git
cd Postify/client
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the `client` directory with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**How to get these values:**
1. Create a project at [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy your Project URL and anon/public key

### 4. Database Setup

Execute the following SQL in your Supabase SQL editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  media_urls TEXT[] NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'text')),
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create likes table
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create comments table
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Important: Disable RLS for most tables (current configuration)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
```

### 5. Storage Setup

Create storage buckets in Supabase:

1. Go to Storage in your Supabase dashboard
2. Create three buckets with the following exact configuration:

#### **Photos Bucket** 📷
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
);

-- Policies for authenticated users only
CREATE POLICY "Authenticated users can read photos" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Users can update their own photos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### **Videos Bucket** 🎥
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/mov', 'video/avi', 'video/quicktime']
);

-- Policies for authenticated users only
CREATE POLICY "Authenticated users can read videos" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Users can update their own videos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own videos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### **Avatars Bucket** 👤
```sql
-- Create bucket (PUBLIC ACCESS for easy avatar display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
);

-- Public read access, authenticated write access
CREATE POLICY "Anyone can read avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Storage Policy Summary:**
| Bucket | Read Access | Write Access | File Size Limit | Allowed Types |
|--------|-------------|--------------|-----------------|---------------|
| `photos` | Authenticated Only | Authenticated Only | 50MB | JPEG, PNG, JPG |
| `videos` | Authenticated Only | Authenticated Only | 100MB | MP4, MOV, AVI, QuickTime |
| `avatars` | **Public** | Authenticated Only | 5MB | JPEG, PNG, JPG |

### 6. Run the Application

```bash
# Start the development server
npx expo start

# For specific platforms
npx expo start --ios     # iOS simulator
npx expo start --android # Android emulator
npx expo start --web     # Web browser
```

## 🎨 UI/UX Features

### **Floating Bubble Menu**
The app features a sophisticated floating bubble menu for upload actions:

- **Radial Layout**: Menu items arranged in a circle around the trigger button
- **Smooth Animations**: Spring-based animations using React Native Reanimated
- **Touch Handling**: Proper backdrop touch detection with z-index management
- **Visual Feedback**: Haptic feedback and smooth transitions
- **Modal Presentation**: Upload screens open as modals with proper navigation

**Implementation Highlights:**
```typescript
// Bubble menu with proper z-index hierarchy
const FloatingMiddleIcon = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  
  return (
    <View style={{ position: 'absolute', zIndex: 1000 }}>
      {/* Backdrop overlay */}
      {menuVisible && (
        <TouchableOpacity 
          style={styles.backdrop}
          onPress={() => setMenuVisible(false)}
        />
      )}
      
      {/* Menu items in radial layout */}
      {menuVisible && menuItems.map((item, index) => (
        <Animated.View key={item.label} style={[
          styles.menuItem,
          { transform: [{ translateX: positions[index].x }] }
        ]}>
          <TouchableOpacity onPress={() => navigation.navigate(item.screen)}>
            <Ionicons name={item.icon} size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
};
```

## 🏗️ Performance Optimizations

### **Promise.all for Parallel Data Fetching**
The app uses Promise.all to fetch related data in parallel for maximum performance:

```typescript
// Parallel fetching of posts, comments, likes, and user data
const fetchFeedData = async () => {
  const [postsData, commentsData, likesData, usersData] = await Promise.all([
    supabase.from('posts').select('*').order('created_at', { ascending: false }),
    supabase.from('comments').select('*'),
    supabase.from('likes').select('*'),
    supabase.from('profiles').select('id, username, avatar_url')
  ]);
  
  // Process and combine data efficiently
  const processedPosts = posts.map(post => ({
    ...post,
    user: users.find(u => u.id === post.user_id),
    likesCount: likes.filter(l => l.post_id === post.id).length,
    comments: comments.filter(c => c.post_id === post.id)
  }));
};
```

### **Tab-aware Video Management**
Videos automatically pause when users switch tabs to conserve battery and improve performance:

```typescript
import { useFocusEffect } from '@react-navigation/native';

const FeedScreen = () => {
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false); // Pause videos when tab loses focus
    }, [])
  );
  
  // Video autoplay only when screen is focused
  const onViewableItemsChanged = ({ viewableItems }) => {
    if (!isScreenFocused) return; // Skip video autoplay when tab inactive
    
    const visibleVideos = viewableItems
      .filter(item => item.item.media_type === 'video')
      .map(item => item.item.id);
    setVisibleItems(new Set(visibleVideos));
  };
};
```

### **Optimized User Data Fetching**
User information is fetched once and reused across comments, replies, and posts to eliminate UI flickering:

```typescript
// Single user data fetch with reuse across components
const processCommentsData = (comments, users) => {
  return comments.map(comment => ({
    ...comment,
    user: users.find(u => u.id === comment.user_id), // Reuse fetched user data
    replies: comment.replies?.map(reply => ({
      ...reply,
      user: users.find(u => u.id === reply.user_id) // Consistent user data
    })) || []
  }));
};
```

## 🏗️ State Management Approach
### **Zustand for Global State**
We use [Zustand](https://github.com/pmndrs/zustand) for lightweight, performant state management:

#### **PostStore (`store/postStore.ts`)**
- **Posts Array**: Main feed data with infinite scroll support
- **Likes Object**: `{ [postId]: Like[] }` for O(1) lookup performance
- **Comments Object**: `{ [postId]: Comment[] }` with nested reply structure
- **Optimistic Updates**: Instant UI updates with background sync to database

#### **AuthStore (`store/authStore.ts`)**
- **User Session**: Current authenticated user data
- **Authentication Methods**: Login, logout, register with email confirmation
- **Error Handling**: Centralized auth error management

### **Why Zustand?**
1. **Minimal Boilerplate**: Less setup compared to Redux
2. **TypeScript Native**: Excellent TypeScript support
3. **Performance**: No providers, direct subscriptions
4. **DevTools**: Built-in debugging capabilities
5. **Bundle Size**: Lightweight (~2kb)

### **Optimistic Update Pattern**
```typescript
// 1. Update UI immediately with temporary data
addLike(tempLike);

// 2. Sync with database in background
const realLike = await supabase.from('likes').insert(tempLike);

// 3. Replace temporary with real data
replaceLike(tempId, realLike);
```

## 🗄️ Database Schema Overview

### **Tables Structure**

#### **`profiles`** (RLS: Disabled)
```sql
id          UUID (PK, FK → auth.users)
username    TEXT
email       TEXT
avatar_url  TEXT (URL to avatar in storage)
created_at  TIMESTAMP
```
*Extends Supabase auth.users with profile data and avatar*

#### **`posts`** (RLS: Disabled)
```sql
id          UUID (PK)
user_id     UUID (FK → auth.users)
media_urls  TEXT[] (Array of storage URLs, empty for text posts)
media_type  TEXT ('image' | 'video' | 'text')
caption     TEXT (content for text posts)
created_at  TIMESTAMP
```
*Supports image, video, and text-only posts*
*Supports both single and multiple media uploads*

#### **`likes`** (RLS: Disabled)
```sql
id          UUID (PK)
post_id     UUID (FK → posts)
user_id     UUID (FK → auth.users)
created_at  TIMESTAMP
UNIQUE(post_id, user_id)
```
*Prevents duplicate likes with composite unique constraint*

#### **`comments`** (RLS: Disabled)
```sql
id          UUID (PK)
post_id     UUID (FK → posts)
user_id     UUID (FK → auth.users)
content     TEXT
parent_id   UUID (FK → comments, nullable)
created_at  TIMESTAMP
```
*Self-referencing for threaded replies (one-level deep)*

### **Row Level Security (RLS) Status**
| Table | RLS Status | Access Control |
|-------|------------|----------------|
| `profiles` | **Disabled** | Open access for app functionality |
| `posts` | **Disabled** | Open access for feed and profiles |
| `likes` | **Disabled** | Open access for interaction counts |
| `comments` | **Disabled** | Open access for comment threads |

*Note: RLS is currently disabled for simplified development. Enable RLS and add appropriate policies for production use.*

### **Storage Buckets**

#### **`photos/`**
```
photos/
├── {user_id}/
│   ├── photo-{timestamp}-0.jpg
│   ├── photo-{timestamp}-1.jpg
│   └── ...
```

#### **`videos/`**
```
videos/
├── {user_id}/
│   ├── video-{timestamp}.mp4
│   ├── video-{timestamp}.mov
│   └── ...
```

#### **`avatars/`**
```
avatars/
├── {user_id}/
│   └── avatar.{ext}
```

*All storage organized by user ID for security and management*

## 🎯 Key Architecture Decisions

### **1. Supabase as Backend**
- **PostgreSQL Database**: Powerful relational database with JSON support
- **Authentication**: Robust auth system with email confirmation
- **Storage**: Integrated file storage with CDN
- **REST API**: Auto-generated APIs from database schema
- **Scalability**: Managed infrastructure with global edge network

### **2. Expo + React Native**
- **Cross-platform**: Single codebase for iOS/Android
- **Fast Development**: Hot reloading and excellent DX
- **Native Modules**: Easy access to device capabilities
- **OTA Updates**: Update apps without app store approval

### **3. Text Posts Implementation**
```typescript
// Text-only posts with character limit
const handleTextPost = async (content: string) => {
  const textPost = {
    media_urls: [], // Empty for text posts
    media_type: 'text',
    caption: content
  };
  
  await uploadPost(textPost);
};
```

### **4. Video Autoplay with Tab Management**
```typescript
// FlatList viewability + tab focus detection
const onViewableItemsChanged = ({ viewableItems }) => {
  if (!isScreenFocused) return; // Pause videos when tab inactive
  
  const visibleVideos = viewableItems
    .filter(item => item.item.media_type === 'video')
    .map(item => item.item.id);
  setVisibleItems(new Set(visibleVideos));
};
```

### **5. Avatar Upload During Registration**
```typescript
// Required avatar upload with registration
const register = async (email, password, name, avatarUri) => {
  // 1. Create user account
  const { user } = await supabase.auth.signUp({ email, password });
  
  // 2. Upload avatar to avatars bucket
  const avatarUrl = await uploadAvatar(user.id, avatarUri);
  
  // 3. Update profile with avatar URL
  await updateProfile({ avatar_url: avatarUrl });
};
```

### **4. Infinite Scroll with Pagination**
- **FlatList**: Native performance for large datasets
- **Batch Loading**: 20 posts per page for optimal performance
- **Background Prefetch**: Smooth scrolling experience
- **Error Recovery**: Handles network failures gracefully

### **5. Optimistic UI Updates**
- **Instant Feedback**: No loading states for user actions
- **Temporary IDs**: Client-generated UUIDs replaced with database IDs
- **Rollback Support**: Error handling reverts optimistic changes
- **State Consistency**: Background sync ensures data integrity

## 📱 Main Components

- **`FeedScreen`**: Main timeline with infinite scroll, tab-aware video autoplay, and Promise.all optimization
- **`ProfileScreen`**: User profile with posts grid, optimized data fetching, and avatar display
- **`PostCard`**: Individual post rendering with carousel, video support, and user interaction
- **`PostCarousel`**: Image slider with dot indicators and smooth transitions
- **`CustomHeader`**: Navigation header with slide-out drawer functionality
- **`SlideInDrawer`**: Modal-based navigation drawer with smooth animations
- **`FloatingMiddleIcon`**: Sophisticated bubble menu with radial layout and modal navigation
- **Upload Screens**: 
  - `UploadSinglePhotoScreen.tsx` - Single photo upload with filters
  - `UploadMultiplePhotosScreen.tsx` - Multiple photo selection and upload
  - `UploadVideoScreen.tsx` - Video upload with compression
  - All screens registered as modals in navigation stack

### **Component Architecture**
```
app/
├── (tabs)/
│   ├── _layout.tsx          # Tab navigation + floating bubble menu
│   ├── index.tsx            # Feed screen with Promise.all optimization
│   └── profile.tsx          # Profile screen with user posts
├── screens/
│   ├── Auth.tsx            # Authentication flow
│   ├── UploadSinglePhotoScreen.tsx
│   ├── UploadMultiplePhotosScreen.tsx
│   └── UploadVideoScreen.tsx
└── components/
    ├── CustomHeader.tsx     # Navigation header
    ├── SlideInDrawer.tsx    # Modal drawer
    └── ui/                  # Reusable UI components
```

## 🔧 Technologies Used

- **Frontend**: React Native, Expo, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: Zustand
- **UI Components**: Custom components with Expo Vector Icons
- **Media Handling**: Expo Image Picker, Expo Video, Expo File System
- **Animations**: React Native Reanimated, React Native Reanimated Carousel
- **Navigation**: Expo Router with file-based routing + modal presentation
- **Performance**: Promise.all for parallel data fetching
- **Video Management**: React Navigation focus effects for tab-aware playback

## 🚀 Production Considerations

### **Security Enhancements for Production**
1. **Enable Row Level Security (RLS):**
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Add appropriate policies for each table
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
```

2. **Storage Bucket Security:**
   - Currently: Avatars are public, photos/videos require authentication
   - Consider: JWT token validation for sensitive media

3. **Rate Limiting:**
   - Implement upload rate limits
   - Add comment/like spam protection

### **Performance Scaling**
1. **Database Optimization:**
   - Add indexes on frequently queried fields
   - Implement database connection pooling
   - Consider read replicas for heavy read operations

2. **Storage Optimization:**
   - Image compression before upload
   - CDN integration for global media delivery
   - Lazy loading for media-heavy feeds

3. **Caching Strategy:**
   - Implement Redis for session management
   - Cache frequently accessed user data
   - Add offline support for better UX

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
