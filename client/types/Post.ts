export interface Post {
	id: string;
	user_id: string;
	media_urls: string[];
	media_type: string;
	caption: string;
	created_at: string;
}
export interface Like {
	id: string;
	post_id: string;
	user_id: string;
	created_at: string;
}
export interface Comment {
	id: string;
	post_id: string;
	user_id: string;
	content: string;
	created_at: string;
	parent_id?: string | null;
	replies?: Comment[];
}