// @ts-check
const { task, series, tscTask, jestTask, parallel, eslintTask } = require('just-scripts');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function buildDll() {
  const buildRoot = path.join(__dirname, 'AssetStudio');
  execSync(
    `"C:/Program Files (x86)/Microsoft Visual Studio/2019/Community/MSBuild/Current/Bin/MSBuild.exe" /target:Texture2DDecoderNative /property:Configuration=Release`,
    { cwd: buildRoot, stdio: ['inherit', 'inherit', 'inherit'] }
  );
  const binDir = path.join(__dirname, 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir)
  }
  fs.copyFileSync(path.join(buildRoot, 'Texture2DDecoderNative/bin/x64/Release/Texture2DDecoderNative.dll'), path.join(binDir, 'Texture2DDecoderNative.dll'))
}

task('ts', tscTask({ build: true }));
task('test', jestTask({ passWithNoTests: true }));
task('lint', eslintTask());
task('ci', series('ts', parallel('test', 'lint')));
task('build:native', () => buildDll())

task('build', () => parallel('ts', 'build:native'))