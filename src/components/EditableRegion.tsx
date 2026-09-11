import { ReactNode, CSSProperties } from 'react';
import type { ComponentStyle } from '../types';

export function componentStyle(c?: ComponentStyle): CSSProperties {
  if (!c) return {};
  return {
    display: c.visible === false ? 'none' : undefined,
    transform: `translate(${c.offset_x || '0px'}, ${c.offset_y || '0px'}) scale(${c.scale || '1'})`,
    width: c.width && c.width !== 'auto' ? c.width : undefined,
    height: c.height && c.height !== 'auto' ? c.height : undefined,
    fontSize: c.font_size && c.font_size !== 'inherit' ? c.font_size : undefined,
    gap: c.gap || undefined,
    padding: c.padding || undefined,
    borderRadius: c.border_radius || undefined,
    boxShadow: c.shadow && c.shadow !== 'none' ? c.shadow : undefined,
    transformOrigin: 'center',
  };
}

export default function EditableRegion({ id, config, children, className = '' }: { id: string; config?: ComponentStyle; children: ReactNode; className?: string }) {
  return <div data-editable-id={id} className={`editable-region ${className}`} style={componentStyle(config)}>{children}</div>;
}
