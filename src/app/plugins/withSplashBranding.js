// Puts "by Sipra" at the bottom of the native splash (Android 12+), like WhatsApp / Claude.
const { withDangerousMod, withFinalizedMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withCopyDrawables = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      const targets = [
        ['splash-branding.png', 'drawable-xxxhdpi'],
        ['splash-branding-dark.png', 'drawable-night-xxxhdpi'],
      ];
      for (const [file, dir] of targets) {
        const src = path.join(root, 'assets', 'images', file);
        if (!fs.existsSync(src)) {
          console.warn('[withSplashBranding] missing ' + file);
          continue;
        }
        const destDir = path.join(res, dir);
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(src, path.join(destDir, 'splash_branding.png'));
      }
      return cfg;
    },
  ]);

// Finalized mods run after every other plugin has written its files,
// so the splash theme already exists by now.
const withBrandingStyle = (config) =>
  withFinalizedMod(config, [
    'android',
    async (cfg) => {
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      const item = '<item name="android:windowSplashScreenBrandingImage">@drawable/splash_branding</item>';
      let patched = 0;
      for (const dir of fs.readdirSync(res)) {
        if (!dir.startsWith('values')) continue;
        const file = path.join(res, dir, 'styles.xml');
        if (!fs.existsSync(file)) continue;
        let xml = fs.readFileSync(file, 'utf8');
        if (xml.includes('windowSplashScreenBrandingImage')) continue;
        const re = /(<style name="[^"]*SplashScreen[^"]*"[^>]*>)/g;
        if (!re.test(xml)) continue;
        xml = xml.replace(re, '$1\n    ' + item);
        fs.writeFileSync(file, xml);
        patched++;
      }
      if (!patched) console.warn('[withSplashBranding] splash style not found, branding image skipped');
      return cfg;
    },
  ]);

module.exports = (config) => withBrandingStyle(withCopyDrawables(config));