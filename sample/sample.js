// @ts-check
const { AssetManager, getTextureBuffer, isSprite } = require('../lib');

const resourcesDir = '<root path>';

async function run(cwd, assetDirGlobs, assetGlobs) {
  const assetManager = new AssetManager();
  console.log(`loading files`);
  await assetManager.loadFiles(cwd, assetDirGlobs, assetGlobs);
  console.log(`loading assets`);
  assetManager.loadAssets();
  console.log(`loading sprites`);
  await Promise.all(
    Array.from(assetManager.namedObjects.values())
      .filter(isSprite)
      .map(async (sprite) => {
        console.log(`Loading sprite '${sprite.name}' texture`);
        const texture = sprite.spriteRenderData.texture.get();
        if (texture) {
          return getTextureBuffer(texture);
        }
      })
  );
  console.log(`done`);
}

run(
  resourcesDir,
  ['resources'],
  ['Icons']
);
