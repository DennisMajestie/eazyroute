/**
 * Transport Mode Icons - EazyRoute ALONG
 * Emoji icons for different transport modes
 */

export const TRANSPORT_ICONS: Record<string, string> = {
    bus: '🚌',
    taxi: '🚖',
    keke: '🛺',
    okada: '🏍️',
    walking: '🚶',
    walk: '🚶',
    cab: '🚕',
    danfo: '🚐',
    brt: '🚍',
    train: '🚃',
    ferry: '⛴️'
};

/**
 * Transport Mode Colors (CSS variable names)
 */
export const TRANSPORT_COLORS: Record<string, string> = {
    bus: 'var(--bus-color)',
    taxi: 'var(--cab-color)',
    keke: 'var(--keke-color)',
    okada: 'var(--okada-color)',
    walking: 'var(--walking-color)',
    walk: 'var(--walking-color)',
    cab: 'var(--cab-color)',
    danfo: 'var(--bus-color)',
    brt: 'var(--bus-color)',
    train: 'var(--info)',
    ferry: 'var(--info)'
};

/**
 * Get transport icon with fallback
 */
export function getTransportIcon(mode: string): string {
    return TRANSPORT_ICONS[mode?.toLowerCase()] || '🚗';
}

/**
 * Get transport color with fallback
 */
export function getTransportColor(mode: string): string {
    return TRANSPORT_COLORS[mode?.toLowerCase()] || 'var(--text-secondary)';
}
