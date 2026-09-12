import { Globe2 } from 'lucide-react';
import { useI18n } from '../i18n';
export default function LanguageSwitcher(){const {locale,setLocale,t}=useI18n(); return <label className="language-switcher" aria-label={t('nav.language')}><Globe2 size={16}/><select value={locale} onChange={e=>setLocale(e.target.value as 'ar'|'en')}><option value="ar">{t('language.ar')}</option><option value="en">{t('language.en')}</option></select></label>}
