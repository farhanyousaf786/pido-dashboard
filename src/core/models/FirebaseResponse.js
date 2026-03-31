// FirebaseResponse model - converted from Flutter firebase_response.dart

export function createFirebaseResponseModel(data = {}) {
  return {
    success: data.success ?? false,
    message: data.message ?? '',
    data: data.data ?? null,
    error: data.error ?? null,
    code: data.code ?? null,
  };
}

// Helper methods
export const FirebaseResponseHelpers = {
  isSuccess: (response) => response.success === true,
  hasError: (response) => response.error != null,
  getErrorMessage: (response) => response.error?.message || response.message || 'Unknown error',
};
