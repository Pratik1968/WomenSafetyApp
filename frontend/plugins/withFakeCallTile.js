const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withFakeCallTileServiceFile(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidSrcPath = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        "com",
        "nameisrk",
        "aegiswomensafety"
      );

      fs.mkdirSync(androidSrcPath, { recursive: true });

      const sourcePath = path.join(projectRoot, "plugins", "FakeCallTileService.java");
      const destPath = path.join(androidSrcPath, "FakeCallTileService.java");

      fs.copyFileSync(sourcePath, destPath);

      return config;
    },
  ]);
}

function withFakeCallTileManifest(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    const hasService = mainApplication.service.some(
      (s) => s.$["android:name"] === ".FakeCallTileService"
    );

    if (!hasService) {
      mainApplication.service.push({
        $: {
          "android:name": ".FakeCallTileService",
          "android:label": "Fake Call",
          "android:icon": "@mipmap/ic_launcher",
          "android:permission": "android.permission.BIND_QUICK_SETTINGS_TILE",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.service.quicksettings.action.QS_TILE",
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
}

module.exports = function withFakeCallTile(config) {
  config = withFakeCallTileServiceFile(config);
  config = withFakeCallTileManifest(config);
  return config;
};
