// InviteFriend model - converted from Flutter invite_friend.dart

export function createInviteFriendModel(data = {}) {
  return {
    id: data.id ?? '',
    inviterId: data.inviterId ?? '',
    inviterName: data.inviterName ?? '',
    inviteeEmail: data.inviteeEmail ?? '',
    inviteePhone: data.inviteePhone ?? null,
    status: data.status ?? 'pending',
    inviteCode: data.inviteCode ?? '',
    rewardAmount: data.rewardAmount ?? 0.0,
    createdAt: data.createdAt ?? new Date(),
    acceptedAt: data.acceptedAt ?? null,
  };
}

// Parse from Firestore
export function inviteFriendFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createInviteFriendModel({
    id: doc.id ?? data?.id ?? '',
    inviterId: data?.inviterId ?? '',
    inviterName: data?.inviterName ?? '',
    inviteeEmail: data?.inviteeEmail ?? '',
    inviteePhone: data?.inviteePhone ?? null,
    status: data?.status ?? 'pending',
    inviteCode: data?.inviteCode ?? '',
    rewardAmount: data?.rewardAmount?.toDouble?.() ?? parseFloat(data?.rewardAmount) ?? 0.0,
    createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt) ?? new Date(),
    acceptedAt: data?.acceptedAt?.toDate?.() ?? (data?.acceptedAt ? new Date(data.acceptedAt) : null),
  });
}
