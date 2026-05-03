const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES';

function patchPodfile(contents) {
  if (contents.includes(MARKER)) {
    return contents;
  }

  const callIdx = contents.indexOf('react_native_post_install(');
  if (callIdx === -1) {
    throw new Error(
      'withFirebaseModularHeadersFix: could not find react_native_post_install in Podfile'
    );
  }

  let i = callIdx;
  while (i < contents.length && contents[i] !== '(') i++;
  let parenDepth = 0;
  for (; i < contents.length; i++) {
    if (contents[i] === '(') parenDepth++;
    else if (contents[i] === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        i++;
        break;
      }
    }
  }

  const lineStart = contents.lastIndexOf('\n', callIdx) + 1;
  const callIndent = contents.slice(lineStart, callIdx);
  const blockIndent =
    callIndent.length >= 2 ? callIndent.slice(0, -2) : '';

  const endRegex = new RegExp(`\\n${blockIndent}end\\b`);
  const rest = contents.slice(i);
  const m = endRegex.exec(rest);
  if (!m) {
    throw new Error(
      'withFirebaseModularHeadersFix: could not locate end of post_install block'
    );
  }
  const insertAt = i + m.index + 1;

  const snippet =
    `${callIndent}# @react-native-firebase + use_frameworks :static fix\n` +
    `${callIndent}installer.pods_project.targets.each do |target|\n` +
    `${callIndent}  target.build_configurations.each do |config|\n` +
    `${callIndent}    config.build_settings['${MARKER}'] = 'YES'\n` +
    `${callIndent}  end\n` +
    `${callIndent}end\n`;

  return contents.slice(0, insertAt) + snippet + contents.slice(insertAt);
}

module.exports = function withFirebaseModularHeadersFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile'
      );
      const original = fs.readFileSync(podfilePath, 'utf8');
      const patched = patchPodfile(original);
      if (patched !== original) {
        fs.writeFileSync(podfilePath, patched);
      }
      return cfg;
    },
  ]);
};
