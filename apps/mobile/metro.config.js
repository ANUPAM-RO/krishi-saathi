// Expo SDK 52+ detects npm workspaces automatically, so the default config is enough.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
