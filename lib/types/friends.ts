// lib/types/friends.ts

export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

/** Row from the `friendships` table */
export type Friendship = {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: FriendshipStatus;
    created_at: string;
    updated_at: string;
};

/** Friend with computed net balance (used in Friends tab list) */
export type FriendWithBalance = {
    friendship_id: string;
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    /** Positive = they owe you, negative = you owe them */
    net_balance: number;
    currency: string;
    last_active_at: string | null;
};

/** Pending friend request (incoming or outgoing) */
export type FriendRequest = {
    friendship_id: string;
    direction: 'incoming' | 'outgoing';
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
};

/** Row from the `friend_codes` table */
export type FriendCode = {
    user_id: string;
    code: string;
    created_at: string;
};

/** Minimal user profile returned by friend search */
export type FriendSearchResult = {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
};

/** Activity feed item for Friends tab */
export type ActivityItem = {
    id: string;
    type: 'split_created' | 'split_settled' | 'room_joined' | 'friend_added' | 'receipt_uploaded';
    actor_name: string;
    description: string;
    amount: number | null;
    currency: string | null;
    room_name: string | null;
    created_at: string;
};
