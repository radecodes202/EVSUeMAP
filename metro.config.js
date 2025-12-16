// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure web platform is properly configured
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'web.js', 'web.jsx', 'web.ts', 'web.tsx'],
  platforms: ['ios', 'android', 'native', 'web'],
};

// Disable Hermes for web - web doesn't support Hermes
config.transformer = {
  ...config.transformer,
  getTransformOptions: async (entryPoints, options) => {
    // Force disable Hermes for web platform
    if (options?.platform === 'web') {
      return {
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
        unstable_transformProfile: 'default', // Use default instead of hermes
      };
    }
    return {
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    };
  },
};

module.exports = config;

