// lib/types/rooms.ts

export type RoomRole = 'owner' | 'admin' | 'member';

export type SourceType = 'manual' | 'personal_import' | 'receipt' | 'statement';

export type SplitType = 'equal' | 'percentage' | 'custom' | 'item_level';

export type SplitStatus = 'pending' | 'settled';

export type RoomTheme = 'blue' | 'emerald' | 'violet' | 'rose' | 'amber';

/** Row from the `rooms` table */
export type Room = {
    id: string;
    name: string;
    created_by: string;
    invite_code: string;
    description: string | null;
    avatar_url: string | null;
    currency: string;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
};

/** Row from the `room_members` table */
export type RoomMember = {
    room_id: string;
    user_id: string;
    role: RoomRole;
    joined_at: string;
};

/** Room member with profile info (for UI display) */
export type RoomMemberWithProfile = RoomMember & {
    display_name: string;
    avatar_url: string | null;
};

/** Row from the `shared_transactions` table */
export type SharedTransaction = {
    id: string;
    room_id: string | null;
    friendship_id: string | null;
    uploaded_by: string;
    original_tx_id: number | null;
    total_amount: number;
    currency: string;
    description: string;
    category: string | null;
    transaction_date: string;
    receipt_url: string | null;
    split_type: SplitType;
    metadata: Record<string, unknown>;
    created_at: string;
};

/** Row from the `receipt_items` table */
export type ReceiptItem = {
    id: string;
    shared_tx_id: string;
    name: string;
    amount: number;
    quantity: number;
    category: string | null;
    created_at: string;
};

/** Row from the `transaction_splits` table */
export type TransactionSplit = {
    id: string;
    shared_tx_id: string;
    item_id: string | null;
    user_id: string;
    amount: number;
    status: SplitStatus;
    settled_at: string | null;
    created_at: string;
};

/** Split with user profile info (for UI display) */
export type TransactionSplitWithProfile = TransactionSplit & {
    display_name: string;
    avatar_url: string | null;
};

/** Per-member balance within a room */
export type RoomBalance = {
    user_id: string;
    display_name: string;
    /** Positive = owed to them, negative = they owe */
    net_balance: number;
    total_paid: number;
    total_owed: number;
};

/** Breakdown of transactions by source type */
export type SourceBreakdown = {
    personal_import: { total: number; count: number };
    receipt: { total: number; count: number };
    statement: { total: number; count: number };
    manual: { total: number; count: number };
};

/** Extended shared transaction with attribution info (for list views) */
export type SharedTransactionWithAttribution = SharedTransaction & {
    uploader_name: string;
    splits: TransactionSplitWithProfile[];
    items: ReceiptItem[];
    is_attributed: boolean;
    source_type: SourceType;
};
