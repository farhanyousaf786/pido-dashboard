// TrustScore model - converted from Flutter trust_score_model.dart

export function createTrustScoreModel(data = {}) {
  return {
    userId: data.userId ?? '',
    score: data.score ?? 0,
    level: data.level ?? 'bronze',
    totalJobsCompleted: data.totalJobsCompleted ?? 0,
    totalEarnings: data.totalEarnings ?? 0.0,
    rating: data.rating ?? 0.0,
    onTimeRate: data.onTimeRate ?? 0.0,
    cancellationRate: data.cancellationRate ?? 0.0,
    disputeRate: data.disputeRate ?? 0.0,
    verified: data.verified ?? false,
    badges: data.badges ?? [],
    updatedAt: data.updatedAt ?? new Date(),
  };
}

// Parse from Firestore
export function trustScoreFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createTrustScoreModel({
    userId: doc.id ?? data?.userId ?? '',
    score: data?.score ?? 0,
    level: data?.level ?? 'bronze',
    totalJobsCompleted: data?.totalJobsCompleted ?? 0,
    totalEarnings: data?.totalEarnings?.toDouble?.() ?? parseFloat(data?.totalEarnings) ?? 0.0,
    rating: data?.rating?.toDouble?.() ?? parseFloat(data?.rating) ?? 0.0,
    onTimeRate: data?.onTimeRate?.toDouble?.() ?? parseFloat(data?.onTimeRate) ?? 0.0,
    cancellationRate: data?.cancellationRate?.toDouble?.() ?? parseFloat(data?.cancellationRate) ?? 0.0,
    disputeRate: data?.disputeRate?.toDouble?.() ?? parseFloat(data?.disputeRate) ?? 0.0,
    verified: data?.verified ?? false,
    badges: data?.badges ?? [],
    updatedAt: data?.updatedAt?.toDate?.() ?? new Date(data?.updatedAt) ?? new Date(),
  });
}

// Helper methods
export const TrustScoreHelpers = {
  isBronze: (ts) => ts.level === 'bronze',
  isSilver: (ts) => ts.level === 'silver',
  isGold: (ts) => ts.level === 'gold',
  isPlatinum: (ts) => ts.level === 'platinum',
  isVerified: (ts) => ts.verified,
  hasBadge: (ts, badge) => ts.badges.includes(badge),
  progressToNextLevel: (ts) => {
    const thresholds = { bronze: 0, silver: 100, gold: 500, platinum: 1000 };
    const current = thresholds[ts.level] || 0;
    const next = ts.level === 'bronze' ? 100 : ts.level === 'silver' ? 500 : ts.level === 'gold' ? 1000 : 1000;
    return Math.min(100, Math.round(((ts.score - current) / (next - current)) * 100));
  },
};
