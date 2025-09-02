# Postify

A modern social media mobile application for sharing photos, videos, and text posts, built with React Native, Expo, and Supabase. Features Instagram-like functionality with optimistic updates, infinite scroll, video autoplay, and user avatars.

## 🚀 Features

- **Multi-media Posts**: Upload single/multiple photos, videos, and text-only posts
- **Text Posts**: Create text-only posts with character limit
- **Profile Avatars**: Required avatar upload during user registration
- **User Profiles**: Dedicated profile screen showing user's posts, avatar, and statistics
- **Real-time Feed**: Infinite scroll with pagination (20 posts per page)
- **Interactive Engagement**: Like posts and threaded comments with replies
- **Video Autoplay**: Videos automatically play when in view, pause when out of view
- **Tab-aware Video Management**: Videos pause when switching between tabs
- **Optimistic Updates**: Instant UI updates for likes, comments, and posts
- **Authentication**: Email/password auth with email confirmation and mandatory avatar upload
- **Performance Optimized**: Parallel data fetching with Promise.all for faster loading
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
```

### 5. Storage Setup

Create storage buckets in Supabase:

1. Go to Storage in your Supabase dashboard
2. Create three buckets:
   - `photos` (for image uploads)
   - `videos` (for video uploads)
   - `avatars` (for user profile pictures)
3. Set all buckets to **public**
4. Configure the following policies for each bucket:

**Photos Bucket Policies:**
- **Authenticated users can read photos** (SELECT, authenticated)
- **Authenticated users can upload photos** (INSERT, authenticated)

**Videos Bucket Policies:**
- **Authenticated users can read videos** (SELECT, authenticated)
- **Authenticated users can upload videos** (INSERT, authenticated)

**Avatars Bucket Policies:**
- **Authenticated users can read avatars** (SELECT, authenticated)
- **Authenticated users can upload avatars** (INSERT, authenticated)

### 6. Run the Application

```bash
# Start the development server
npx expo start

# For specific platforms
npx expo start --ios     # iOS simulator
npx expo start --android # Android emulator
npx expo start --web     # Web browser
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

#### **`profiles`**
```sql
id          UUID (PK, FK → auth.users)
username    TEXT
email       TEXT
avatar_url  TEXT (URL to avatar in storage)
created_at  TIMESTAMP
```
*Extends Supabase auth.users with profile data and avatar*

#### **`posts`**
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

#### **`likes`**
```sql
id          UUID (PK)
post_id     UUID (FK → posts)
user_id     UUID (FK → auth.users)
created_at  TIMESTAMP
UNIQUE(post_id, user_id)
```
*Prevents duplicate likes with composite unique constraint*

#### **`comments`**
```sql
id          UUID (PK)
post_id     UUID (FK → posts)
user_id     UUID (FK → auth.users)
content     TEXT
parent_id   UUID (FK → comments, nullable)
created_at  TIMESTAMP
```
*Self-referencing for threaded replies (one-level deep)*

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

- **`FeedScreen`**: Main timeline with infinite scroll and video autoplay
- **`PostCard`**: Individual post rendering with carousel and video support
- **`PostCarousel`**: Image slider with dot indicators
- **`CustomHeader`**: Navigation header with slide-out drawer
- **`SlideInDrawer`**: Modal-based navigation drawer
- **Upload Screens**: Separate screens for single/multiple photos and videos

## 🔧 Technologies Used

- **Frontend**: React Native, Expo, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: Zustand
- **UI Components**: Custom components with Expo Vector Icons
- **Media Handling**: Expo Image Picker, Expo Video, Expo File System
- **Animations**: React Native Reanimated, React Native Reanimated Carousel
- **Navigation**: Expo Router with file-based routing

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
