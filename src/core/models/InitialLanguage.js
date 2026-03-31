// InitialLanguage model - converted from Flutter initial_language_model.dart

export function createInitialLanguageModel(data = {}) {
  return {
    code: data.code ?? 'en',
    name: data.name ?? 'English',
    nativeName: data.nativeName ?? 'English',
    isRTL: data.isRTL ?? false,
    flag: data.flag ?? '',
    isDefault: data.isDefault ?? false,
  };
}

// Parse from JSON
export function initialLanguageFromJson(json) {
  return createInitialLanguageModel({
    code: json?.code ?? 'en',
    name: json?.name ?? 'English',
    nativeName: json?.nativeName ?? 'English',
    isRTL: json?.isRTL ?? false,
    flag: json?.flag ?? '',
    isDefault: json?.isDefault ?? false,
  });
}

// Convert to JSON
export function initialLanguageToJson(language) {
  return {
    code: language.code,
    name: language.name,
    nativeName: language.nativeName,
    isRTL: language.isRTL,
    flag: language.flag,
    isDefault: language.isDefault,
  };
}
