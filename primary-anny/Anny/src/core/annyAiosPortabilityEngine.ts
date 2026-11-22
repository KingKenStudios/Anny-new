/**
 * ANNY — AIOS CROSS-PLATFORM PORTABILITY ENGINE (PHASE 14)
 * Translates AIOS-Native applications into compatibility targets (Android, Windows, iOS, macOS, Linux, Web)
 * STRICTLY UPON EXPLICIT USER REQUEST.
 *
 * Policy:
 * Default = AIOS ONLY.
 * Android/Windows/iOS/macOS/Linux/Web = Explicit Opt-In Only.
 */

import { AiosAppManifest, AiosGeneratedProject } from './annyAiosApplicationGenerator';

export type CompatibilityTarget = 'ANDROID' | 'WINDOWS' | 'IOS' | 'MACOS' | 'LINUX' | 'WEB_STANDALONE';

export interface PortabilityResult {
  sourceApplicationId: string;
  targetPlatform: CompatibilityTarget;
  isExplicitOptIn: boolean;
  adapterFiles: Record<string, string>;
  buildInstructions: string;
  policyCheck: {
    passed: boolean;
    reason: string;
  };
}

export class AnnyAiosPortabilityEngine {
  private static instance: AnnyAiosPortabilityEngine;

  private constructor() {}

  public static getInstance(): AnnyAiosPortabilityEngine {
    if (!AnnyAiosPortabilityEngine.instance) {
      AnnyAiosPortabilityEngine.instance = new AnnyAiosPortabilityEngine();
    }
    return AnnyAiosPortabilityEngine.instance;
  }

  /**
   * Generates a compatibility build wrapper for a specified target platform.
   * Fails safety validation if invoked without explicit user opt-in.
   */
  public generatePlatformAdapter(
    aiosProject: AiosGeneratedProject,
    target: CompatibilityTarget,
    explicitUserOptIn: boolean
  ): PortabilityResult {
    if (!explicitUserOptIn) {
      return {
        sourceApplicationId: aiosProject.manifest.applicationId,
        targetPlatform: target,
        isExplicitOptIn: false,
        adapterFiles: {},
        buildInstructions: 'Refused: ANNY default target is AIOS ONLY. Compatibility export requires explicit user opt-in.',
        policyCheck: {
          passed: false,
          reason: 'Cross-platform generation attempted without explicit opt-in. AIOS-only policy enforced.'
        }
      };
    }

    const adapterFiles: Record<string, string> = {};
    let instructions = '';

    switch (target) {
      case 'ANDROID':
        adapterFiles['/android/app/build.gradle'] = `apply plugin: 'com.android.application'\nandroid {\n  namespace "${aiosProject.manifest.applicationId}"\n  compileSdkVersion 34\n}`;
        adapterFiles['/android/app/src/main/AndroidManifest.xml'] = `<manifest package="${aiosProject.manifest.applicationId}">\n  <application android:label="${aiosProject.manifest.name}" />\n</manifest>`;
        instructions = 'Android Gradle project configured with AIOS bridge wrapper.';
        break;

      case 'WINDOWS':
        adapterFiles['/windows/App.xaml'] = `<Application x:Class="${aiosProject.manifest.name}.App" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" />`;
        adapterFiles['/windows/package.appxmanifest'] = `<?xml version="1.0" encoding="utf-8"?>\n<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10">\n  <Identity Name="${aiosProject.manifest.applicationId}" Version="1.0.0.0" />\n</Package>`;
        instructions = 'Windows WinUI / Desktop application wrapper configured.';
        break;

      case 'IOS':
        adapterFiles['/ios/App/Info.plist'] = `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>\n  <key>CFBundleDisplayName</key>\n  <string>${aiosProject.manifest.name}</string>\n</dict>\n</plist>`;
        instructions = 'iOS Xcode workspace bundle configured.';
        break;

      case 'LINUX':
        adapterFiles['/linux/app.desktop'] = `[Desktop Entry]\nType=Application\nName=${aiosProject.manifest.name}\nExec=aios-runtime\nIcon=${aiosProject.manifest.icon}`;
        instructions = 'Linux XDG desktop entry and package spec configured.';
        break;

      case 'MACOS':
        adapterFiles['/macos/Info.plist'] = `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>\n  <key>CFBundleName</key>\n  <string>${aiosProject.manifest.name}</string>\n</dict>\n</plist>`;
        instructions = 'macOS App bundle configured.';
        break;

      case 'WEB_STANDALONE':
        adapterFiles['/public/manifest.webmanifest'] = JSON.stringify({
          name: aiosProject.manifest.name,
          short_name: aiosProject.manifest.name,
          start_url: '/',
          display: 'standalone'
        }, null, 2);
        instructions = 'Progressive Web App manifest configured.';
        break;
    }

    return {
      sourceApplicationId: aiosProject.manifest.applicationId,
      targetPlatform: target,
      isExplicitOptIn: true,
      adapterFiles,
      buildInstructions: instructions,
      policyCheck: {
        passed: true,
        reason: `Explicit opt-in verified for target platform ${target}. Generated compatibility adapter.`
      }
    };
  }
}

export const annyAiosPortabilityEngine = AnnyAiosPortabilityEngine.getInstance();
