// Admin model - converted from Flutter admin model

export function createAdminModel(data = {}) {
  return {
    /** Firestore document id in `adminUsers` (for updates from the dashboard). */
    firestoreDocId: data.firestoreDocId ?? null,
    uid: data.uid ?? '',
    email: data.email ?? '',
    name: data.name ?? '',
    role: data.role ?? '',
    permissions: data.permissions ?? {},
    isActive: data.isActive ?? true,
    createdAt: data.createdAt ?? null,
  };
}

// Parse from Firestore
export function adminFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  const id = doc.id ?? data?.id ?? null;
  return createAdminModel({
    firestoreDocId: id,
    uid: data?.uid ?? '',
    email: data?.email ?? '',
    name: data?.name ?? '',
    role: data?.role ?? '',
    permissions: data?.permissions ?? {},
    isActive: data?.isActive ?? true,
    createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt) ?? null,
  });
}

// Convert to Firestore
export function adminToFirestore(admin) {
  return {
    uid: admin.uid,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    permissions: admin.permissions,
    isActive: admin.isActive,
    ...(admin.createdAt && { createdAt: admin.createdAt }),
  };
}

// Helper methods
export const AdminHelpers = {
  isAdmin: (admin) => admin.role === 'admin',
  isActive: (admin) => admin.isActive !== false,
  hasPermission: (admin, permission) =>
    admin.permissions?.[permission] ?? false,
  displayName: (admin) => admin.name || admin.email || 'Admin',
};
