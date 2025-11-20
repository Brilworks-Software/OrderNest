/**
 * OrderNest Theme System
 * Centralized theme configuration for consistent design across the app
 */

export const theme = {
  // Primary Colors - Role-based
  colors: {
    // Role-specific primary colors
    primary: {
      manager: '#104A9c',
      staff: '#10b981',
      chef: '#ff4444',
    },
    
    // Status colors
    status: {
      success: '#34c759',
      warning: '#ff9f0a',
      error: '#ff6b6b',
      info: '#0a84ff',
      pending: '#ff9f0a',
      preparing: '#0a84ff',
      served: '#34c759',
      paid: '#8e8e93',
      completed: '#8e8e93',
      available: '#34c759',
      occupied: '#ff9f0a',
      reserved: '#af52de',
    },
    
    // Semantic colors
    semantic: {
      background: {
        primary: '#f8f9fa',
        secondary: '#ffffff',
        tertiary: '#f3f4f6',
        card: '#ffffff',
        input: '#f9fafb',
        overlay: 'rgba(0, 0, 0, 0.3)',
      },
      text: {
        primary: '#1a1a1a',
        secondary: '#333333',
        tertiary: '#666666',
        quaternary: '#6b7280',
        inverse: '#ffffff',
        placeholder: '#9ca3af',
      },
      border: {
        primary: '#e5e7eb',
        secondary: '#f0f0f0',
        focus: '#104A9c',
      },
    },
    
    // Quick access colors
    quickAccess: {
      orders: '#ff6b6b',
      menu: '#104A9c',
      tables: '#34c759',
      staff: '#0a84ff',
      settings: '#ff9f0a',
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    fontSize: {
      xs: 11,
      sm: 12,
      base: 14,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 28,
      '4xl': 32,
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
    },
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
  },
  
  // Border Radius
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
  },
  
  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
    colored: (color: string) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  
  // Layout
  layout: {
    maxWidth: {
      container: 1400,
      card: 500,
    },
    padding: {
      screen: 20,
      card: 16,
      input: 12,
    },
  },
};

// Helper function to get role-based primary color
export const getPrimaryColor = (role: 'manager' | 'staff' | 'chef' = 'manager') => {
  return theme.colors.primary[role];
};

// Helper function to get status color
export const getStatusColor = (status: string) => {
  const statusLower = status?.toLowerCase();
  return theme.colors.status[statusLower as keyof typeof theme.colors.status] || theme.colors.semantic.text.tertiary;
};

// Helper function to create color with opacity
export const withOpacity = (color: string, opacity: number) => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Helper function to add opacity suffix (for React Native)
export const addOpacitySuffix = (color: string, opacity: number) => {
  // For React Native, we use hex with alpha channel
  const hex = color.replace('#', '');
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `#${hex}${alpha}`;
};

export default theme;

