// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Required for expo-sqlite to work on web (bundles the wa-sqlite.wasm asset)
config.resolver.assetExts.push('wasm');

module.exports = config;
