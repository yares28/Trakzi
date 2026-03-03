// lib/types/challenges.ts

export type ChallengeGoalType = 'individual_cap' | 'group_total';

/** Row from the `challenges` table */
export type Challenge = {
    id: string;
    created_by: string;
    title: string;
    category: string;
    goal_type: ChallengeGoalType;
    target_amount: number;
    starts_at: string;
    ends_at: string;
    created_at: string;
};

/** Row from the `challenge_participants` table */
export type ChallengeParticipant = {
    challenge_id: string;
    user_id: string;
    joined_at: string;
    /** Cached aggregate of spending in the challenge category during the date range */
    current_spend: number;
};

/** Participant with profile info (for UI display) */
export type ChallengeParticipantWithProfile = ChallengeParticipant & {
    display_name: string;
    avatar_url: string | null;
};

/** Challenge with participants (for challenge list/detail views) */
export type ChallengeWithParticipants = Challenge & {
    participants: ChallengeParticipantWithProfile[];
    /** Days remaining (computed client-side or server-side) */
    days_remaining: number;
    /** Whether the current user is a participant */
    is_member: boolean;
};

// ─── Score-Based Challenge Groups ───────────────────────────────────────────

export type ChallengeMetric = 'savingsRate' | 'financialHealth' | 'fridgeScore' | 'wantsPercent';

/** Row from the `challenge_groups` table */
export type ChallengeGroup = {
    id: string;
    name: string;
    created_by: string;
    is_public: boolean;
    invite_code: string;
    metrics: ChallengeMetric[];
    created_at: string;
};

/** Member within a challenge group — includes live score + all-time points */
export type ChallengeGroupMember = {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    total_points: number;    // all-time accumulated points across months
    joined_at: string;
    // Live current-month scores (null if not yet ranked)
    currentScores: Partial<Record<ChallengeMetric, number | null>>;
    isRanked: boolean;
};

/** Full group detail for the Challenges Tab UI */
export type ChallengeGroupWithMembers = ChallengeGroup & {
    memberCount: number;
    members: ChallengeGroupMember[];
    /** How many days left in the current month */
    daysLeftInMonth: number;
    /** Your current position per metric, e.g. { savingsRate: 1, fridgeScore: 3 } */
    yourRanks: Partial<Record<ChallengeMetric, number>>;
};

/** A single month's leaderboard result for all-time tracking */
export type ChallengeMonthlyResult = {
    id: string;
    group_id: string;
    user_id: string;
    display_name: string;
    month: string;
    metric: ChallengeMetric;
    rank: number;
    points: number;
    score: number;
};
