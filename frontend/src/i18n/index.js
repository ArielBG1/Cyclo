import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import es from './locales/es.json'
import en from './locales/en.json'
import ko from './locales/ko.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      ko: { translation: ko },
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en', 'ko'],
    load: 'languageOnly',          // 'es-AR' → 'es', 'en-US' → 'en', etc.
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,           // React ya escapa
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    returnEmptyString: false,
  })

// Sincronizar el atributo `lang` del <html> para que el CSS pueda aplicar
// fuentes específicas por idioma (Noto Sans KR cuando lang="ko").
function aplicarLangAlHtml(lng) {
  const base = (lng || 'es').split('-')[0]
  document.documentElement.setAttribute('lang', base)
}

aplicarLangAlHtml(i18n.resolvedLanguage || i18n.language)
i18n.on('languageChanged', aplicarLangAlHtml)

export default i18n
