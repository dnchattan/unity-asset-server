// @ts-check
const { AssetManager, getTextureBuffer, isSprite } = require('../lib');

const resourcesDir = 'C:/Users/PowerSpec/AppData/Local/Plarium/PlariumPlay/StandAloneApps/raid';

async function run(cwd, assetDirGlobs, assetGlobs) {
  const assetManager = new AssetManager();
  console.log(`loading files`);
  await assetManager.loadFiles(cwd, assetDirGlobs, assetGlobs);
  console.log(`loading assets`);
  assetManager.loadAssets();
  // console.log(`loading textures`);
  // await Promise.all(Array.from(assetManager.namedObjects.values()).filter(isTexture2D).map(getTextureBuffer));
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
  ['resources', '+([\\d])/Raid_Data/StreamingAssets/AssetBundles'],
  ['HeroAvatars*', 'Shards', 'Icons', 'BmilIcons', 'AdditionalIcons']
);
