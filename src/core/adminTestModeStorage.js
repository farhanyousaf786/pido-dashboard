/** Browser persistence for admin test mode (swap for Firestore later if needed). */
export const ADMIN_TEST_MODE_STORAGE_KEY = 'pido-dashboard-admin-test-mode';

export function readAdminTestModeFromStorage() {
  try {
    return localStorage.getItem(ADMIN_TEST_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeAdminTestModeToStorage(enabled) {
  try {
    if (enabled) {
      localStorage.setItem(ADMIN_TEST_MODE_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_TEST_MODE_STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}
