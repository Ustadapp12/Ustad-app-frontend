const { getDefaultConfig } = require('expo/metro-config');

// inlineRequires makes every require()/import lazy by default (deferred
// until the code that uses it actually runs) instead of evaluating the
// whole module tree up front on cold start.
const config = getDefaultConfig(__dirname);
config.transformer.getTransformOptions = async () => ({
  transform: { inlineRequires: true },
});

module.exports = config;
