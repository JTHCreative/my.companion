const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODULAR_HEADERS_MARKER = '# rnfirebase-static-fix:modular_headers';
const PRE_INSTALL_MARKER = '# rnfirebase-static-fix:pre_install';
const POST_INSTALL_MARKER = 'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES';
const BUILD_FROM_SOURCE_MARKER = '# rnfirebase-static-fix:build_from_source';

function injectBuildFromSource(contents) {
  if (contents.includes(BUILD_FROM_SOURCE_MARKER)) {
    return contents;
  }

  const callIdx = contents.indexOf('use_react_native!(');
  if (callIdx === -1) {
    throw new Error(
      'withFirebaseModularHeadersFix: could not find use_react_native! in Podfile'
    );
  }

  let i = callIdx;
  while (i < contents.length && contents[i] !== '(') i++;
  const openParen = i;
  i++;

  const lineStart = contents.lastIndexOf('\n', callIdx) + 1;
  const callIndent = contents.slice(lineStart, callIdx);
  const argIndent = callIndent + '  ';

  const insertAt = openParen + 1;
  const snippet =
    `\n${argIndent}${BUILD_FROM_SOURCE_MARKER}` +
    `\n${argIndent}:build_from_source => true,`;

  return contents.slice(0, insertAt) + snippet + contents.slice(insertAt);
}

function injectGlobalModularHeaders(contents) {
  if (contents.includes(MODULAR_HEADERS_MARKER)) {
    return contents;
  }

  const anchorRegex = /^(prepare_react_native_project!.*)$/m;
  const m = anchorRegex.exec(contents);
  if (!m) {
    throw new Error(
      'withFirebaseModularHeadersFix: could not find prepare_react_native_project! in Podfile'
    );
  }

  const insertAt = m.index + m[0].length;
  const snippet =
    `\n\n${MODULAR_HEADERS_MARKER}` +
    `\nuse_modular_headers!`;

  return contents.slice(0, insertAt) + snippet + contents.slice(insertAt);
}

function injectPreInstallHook(contents) {
  if (contents.includes(PRE_INSTALL_MARKER)) {
    return contents;
  }

  const anchorRegex = /^(prepare_react_native_project!.*)$/m;
  const m = anchorRegex.exec(contents);
  if (!m) {
    throw new Error(
      'withFirebaseModularHeadersFix: could not find prepare_react_native_project! in Podfile'
    );
  }

  const insertAt = m.index + m[0].length;
  const snippet =
    `\n\n${PRE_INSTALL_MARKER}\n` +
    `pre_install do |installer|\n` +
    `  installer.pod_targets.each do |pod|\n` +
    `    next unless pod.name.start_with?('React') || pod.name.start_with?('RCT') ||\n` +
    `                pod.name.start_with?('RNFB') || pod.name.start_with?('Firebase') ||\n` +
    `                pod.name.start_with?('Google') || pod.name == 'glog' ||\n` +
    `                pod.name == 'RCT-Folly' || pod.name == 'fmt' ||\n` +
    `                pod.name == 'DoubleConversion' || pod.name == 'SocketRocket' ||\n` +
    `                pod.name == 'hermes-engine' || pod.name == 'boost'\n` +
    `    pod.specs.each do |spec|\n` +
    `      spec.attributes_hash['modular_headers'] = true\n` +
    `    end\n` +
    `  end\n` +
    `end\n`;

  return contents.slice(0, insertAt) + snippet + contents.slice(insertAt);
}

function injectPostInstallSetting(contents) {
  if (contents.includes(POST_INSTALL_MARKER)) {
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
    `${callIndent}    config.build_settings['${POST_INSTALL_MARKER}'] = 'YES'\n` +
    `${callIndent}    config.build_settings['DEFINES_MODULE'] = 'YES'\n` +
    `${callIndent}  end\n` +
    `${callIndent}end\n`;

  return contents.slice(0, insertAt) + snippet + contents.slice(insertAt);
}

function patchPodfile(contents) {
  let out = injectBuildFromSource(contents);
  out = injectGlobalModularHeaders(out);
  out = injectPreInstallHook(out);
  out = injectPostInstallSetting(out);
  return out;
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

module.exports.__test = { patchPodfile };
