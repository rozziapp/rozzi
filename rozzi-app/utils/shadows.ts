import { Platform, ViewStyle } from 'react-native';

/**
 * Cross-platform shadow styles that work on both web and native.
 * On web, uses boxShadow. On native, uses shadow* props.
 */

interface ShadowOptions {
    color?: string;
    offsetX?: number;
    offsetY?: number;
    opacity?: number;
    radius?: number;
    elevation?: number;
}

type ShadowStyle = ViewStyle & { boxShadow?: string };

/**
 * Creates cross-platform shadow styles
 * @param options Shadow configuration options
 * @returns Style object with appropriate shadow properties for the current platform
 */
export const createShadow = ({
    color = '#000',
    offsetX = 0,
    offsetY = 2,
    opacity = 0.1,
    radius = 4,
    elevation = 3,
}: ShadowOptions = {}): ShadowStyle => {
    if (Platform.OS === 'web') {
        // Convert color and opacity to rgba for web
        const rgbaColor = hexToRgba(color, opacity);
        return {
            boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${rgbaColor}`,
        };
    }

    // Native platforms (iOS/Android)
    return {
        shadowColor: color,
        shadowOffset: { width: offsetX, height: offsetY },
        shadowOpacity: opacity,
        shadowRadius: radius,
        elevation: elevation,
    };
};

/**
 * Pre-defined shadow presets for common use cases
 */
export const shadows = {
    /** Subtle shadow for cards */
    card: createShadow({ offsetY: 2, radius: 4, opacity: 0.08, elevation: 2 }),

    /** Medium shadow for elevated elements */
    medium: createShadow({ offsetY: 4, radius: 8, opacity: 0.12, elevation: 4 }),

    /** Strong shadow for modals and popups */
    strong: createShadow({ offsetY: 8, radius: 16, opacity: 0.2, elevation: 8 }),

    /** Purple accent shadow */
    purple: createShadow({ color: '#8b5cf6', offsetY: 4, radius: 8, opacity: 0.3, elevation: 4 }),

    /** Header/navbar shadow */
    header: createShadow({ offsetY: 2, radius: 4, opacity: 0.1, elevation: 3 }),

    /** Button shadow */
    button: createShadow({ offsetY: 2, radius: 6, opacity: 0.15, elevation: 3 }),

    /** No shadow */
    none: {} as ShadowStyle,
};

/**
 * Helper to convert hex color to rgba
 */
function hexToRgba(hex: string, opacity: number): string {
    // Handle shorthand hex
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }

    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default createShadow;
