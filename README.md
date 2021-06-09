# unity-asset-server

This is a work-in-progress library that allows you to find and load resources from Unity Asset files. It is based heavily on `Prefare/AssetStudio`, which it consumes its Texture2DDecoder dll from. 

Not all data types are supported yet, although if you find one you need missing, feel free to add it and submit a pull request!

## Usage

The core API is exposed from the `AssetManager` class:
```ts
import { AssetManager } from 'unity-asset-server';
const assetMgr = new AssetManager();
```
You can load bundle files by calling `loadFiles`:
```ts
await assetManager.loadFiles(
  '<base asset files directory>', 
  ['<glob patterns to match subdirectories>'], 
  ['<glob patterns for individual asset files to load']
);
```

For example:
```ts
/**
 * This would find any of the following example resources:
 *  - C:/MyGameDir/resources/Icons.asset
 *  - C:/MyGameDir/resources/ShardTextures_a.asset
 *  - C:/MyGameDir/resources/ShardTextures_b.asset
 *  - C:/MyGameDir/resources/ShardTextures_123.asset
 *  - C:/MyGameDir/resources/ShardTextures_123.asset
 *  - C:/MyGameDir/v38/Game_Data/Streaming_Assets/Icons.asset
 *  - C:/MyGameDir/v38/Game_Data/Streaming_Assets/ShardTextures_a.asset
 *  - C:/MyGameDir/v38/Game_Data/Streaming_Assets/ShardTextures_b.asset
 *  - C:/MyGameDir/v38/Game_Data/Streaming_Assets/ShardTextures_123.asset
 *  - C:/MyGameDir/v38/Game_Data/Streaming_Assets/ShardTextures_123.asset
 */
run('C:/MyGameDir', ['resources', 'v38/Game_Data/Streaming_Assets'], ['Icons.asset', 'SharedTextures_*.unity3d']);
```

Once all your asset files have been loaded, call `loadAssets` to index those assets and build a shallow list of all assets available:
```ts
assetManager.loadAssets();
```

And finally, you can access the assets available via `namedAssets` on the `AssetManager` instance:

```ts
const asset = assetManager.namedObjects.get('Icon_244');
if (isTexture2D(asset)) {
  const buffer = getTextureBuffer(asset);
  // ... do something with the raw texture buffer (RRGGBBAA format)
}
```

## Development
### Prerequisites

* [Visual Studio 2019 Community Edition](https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=Community&rel=16)
* [FBX SDK 2020.0.1](https://www.autodesk.com/developer-network/platform-technologies/fbx-sdk-2020-0)

### Submodules
After cloning, make sure to run `git submodule update --init --recursive` to pull down the required submodules.

### Building
Run `yarn build`. Both the required native DLL and typescript code will be compiled.

