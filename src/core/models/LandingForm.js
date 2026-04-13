export function landingFormFromFirestore(docSnap) {
  const d = docSnap.data() || {};
  return {
    docId: docSnap.id,
    address: d.address ?? '',
    contact: d.contact ?? '',
    createdAt: d.createdAt ?? null,
    email: d.email ?? '',
    firstName: d.firstName ?? '',
    lastName: d.lastName ?? '',
    id: d.id != null ? String(d.id) : docSnap.id,
    ipAddress: d.ipAddress ?? '',
    profession: d.profession ?? '',
    status: (d.status ?? 'pending').toString(),
    submittedAt: d.submittedAt ?? null,
    userAgent: d.userAgent ?? '',
  };
}

export function getLandingFormSortTime(form) {
  const s = form?.submittedAt;
  if (s && typeof s.toDate === 'function') {
    const x = s.toDate();
    if (x && !Number.isNaN(x.getTime())) return x.getTime();
  }
  if (s instanceof Date && !Number.isNaN(s.getTime())) return s.getTime();
  if (typeof form?.createdAt === 'string' && form.createdAt) {
    const t = Date.parse(form.createdAt);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}
