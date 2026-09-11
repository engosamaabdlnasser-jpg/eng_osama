import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultSiteSettings, getSiteSettings } from '../services/data';
import type { SiteSettings } from '../types';

type Theme = 'light' | 'dark';
type ThemeContextValue = { theme: Theme; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

function applySiteDesign(settings: SiteSettings) {
  const root = document.documentElement;
  root.style.setProperty('--bg-light', settings.light_bg);
  root.style.setProperty('--surface-light', settings.light_surface);
  root.style.setProperty('--text-light', settings.light_text);
  root.style.setProperty('--muted-light', settings.light_muted);
  root.style.setProperty('--border-light', settings.light_border);
  root.style.setProperty('--accent-light', settings.light_accent);
  root.style.setProperty('--accent-soft-light', settings.light_accent_soft);
  root.style.setProperty('--bg-dark', settings.dark_bg);
  root.style.setProperty('--surface-dark', settings.dark_surface);
  root.style.setProperty('--text-dark', settings.dark_text);
  root.style.setProperty('--muted-dark', settings.dark_muted);
  root.style.setProperty('--border-dark', settings.dark_border);
  root.style.setProperty('--accent-dark', settings.dark_accent);
  root.style.setProperty('--accent-soft-dark', settings.dark_accent_soft);
  root.style.setProperty('--ui-radius', settings.ui_radius || '20px');
  root.style.setProperty('--ui-shadow', settings.ui_shadow || '0 18px 50px rgba(15,23,42,.12)');
  const ui = settings.ui_controls || defaultSiteSettings.ui_controls;
  root.style.setProperty('--ui-container-width', ui.container_width || '1120px');
  root.style.setProperty('--ui-header-height', ui.header_height || '72px');
  root.style.setProperty('--ui-section-padding', ui.section_padding || '72px 0');
  root.style.setProperty('--ui-section-gap', ui.section_gap || '18px');
  root.style.setProperty('--ui-card-padding', ui.card_padding || '20px');
  root.style.setProperty('--ui-button-height', ui.button_height || '44px');
  root.style.setProperty('--ui-icon-size', ui.icon_size || '20px');
  root.style.setProperty('--ui-button-icon-size', ui.button_icon_size || '18px');
  root.style.setProperty('--ui-header-logo-size', ui.header_logo_size || '36px');
  root.style.setProperty('--ui-header-gap', ui.header_gap || '18px');
  root.style.setProperty('--ui-header-logo-offset-x', ui.header_logo_offset_x || '0px');
  root.style.setProperty('--ui-header-actions-offset-x', ui.header_actions_offset_x || '0px');
  root.style.setProperty('--ui-cards-offset-y', ui.cards_offset_y || '0px');
  root.style.setProperty('--ui-category-icon-size', ui.category_icon_size || '28px');
  root.style.setProperty('--ui-footer-padding', ui.footer_padding || '30px 0');
  root.style.setProperty('--ui-hero-title-size', ui.hero_title_size || 'clamp(40px,7vw,72px)');
  root.style.setProperty('--ui-hero-offset-y', ui.hero_offset_y || '0px');
  root.style.setProperty('--ui-hero-description-size', ui.hero_description_size || '18px');
  root.style.setProperty('--ui-button-radius', ui.button_radius || '12px');
  root.style.setProperty('--ui-card-radius', ui.card_radius || '20px');
  root.style.setProperty('--ui-card-offset-x', ui.card_offset_x || '0px');
  root.style.setProperty('--ui-card-scale', ui.card_scale || '1');
  root.style.setProperty('--ui-category-icon-offset-x', ui.category_icon_offset_x || '0px');
  root.style.setProperty('--ui-category-icon-offset-y', ui.category_icon_offset_y || '0px');
  root.style.setProperty('--ui-category-card-padding', ui.category_card_padding || '20px');
  root.style.setProperty('--ui-nav-gap', ui.nav_gap || '18px');
  root.style.setProperty('--ui-footer-margin-top', ui.footer_margin_top || '40px');
  root.style.setProperty('--ui-announcement-height', ui.announcement_height || 'auto');
  root.style.setProperty('--site-font', settings.font_family || 'Cairo');
  root.dataset.font = settings.font_family || 'Cairo';
  root.style.setProperty('--auth-background-image', settings.auth_background_image ? `url("${settings.auth_background_image}")` : 'none');
  root.style.setProperty('--auth-visual-image', settings.auth_visual_image ? `url("${settings.auth_visual_image}")` : 'none');

  let style = document.getElementById('eng-osama-custom-css') as HTMLStyleElement | null;
  if (!style) { style = document.createElement('style'); style.id = 'eng-osama-custom-css'; document.head.appendChild(style); }
  style.textContent = settings.custom_css || '';

  let fontStyle = document.getElementById('eng-osama-font-import') as HTMLStyleElement | null;
  if (!fontStyle) { fontStyle = document.createElement('style'); fontStyle.id = 'eng-osama-font-import'; document.head.appendChild(fontStyle); }
  const fonts: Record<string,string> = {
    Cairo: 'Cairo:wght@400;500;600;700;800;900',
    Tajawal: 'Tajawal:wght@400;500;700;800;900',
    'Noto Kufi Arabic': 'Noto+Kufi+Arabic:wght@400;500;600;700;800',
    'IBM Plex Sans Arabic': 'IBM+Plex+Sans+Arabic:wght@400;500;600;700',
    'Readex Pro': 'Readex+Pro:wght@400;500;600;700',
  };
  const family = fonts[settings.font_family];
  fontStyle.textContent = family ? `@import url('https://fonts.googleapis.com/css2?family=${family}&display=swap');` : '';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('eng-osama-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('eng-osama-theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    getSiteSettings().then(settings => { if (active) applySiteDesign(settings); }).catch(() => applySiteDesign(defaultSiteSettings));
    const onUpdated = (event: Event) => {
      const settings = (event as CustomEvent<SiteSettings>).detail;
      if (settings) applySiteDesign(settings);
    };
    window.addEventListener('eng-osama:site-settings-updated', onUpdated);
    return () => { active = false; window.removeEventListener('eng-osama:site-settings-updated', onUpdated); };
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() { const value = useContext(ThemeContext); if (!value) throw new Error('useTheme must be used inside ThemeProvider'); return value; }
