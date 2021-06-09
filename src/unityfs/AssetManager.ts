import fs from 'fs';
import path from 'path';
import { BundleFile } from './BundleFile';
import { EndianReader } from './EndianReader';
import { ObjectReader } from './ObjectReader';
import { createObject } from './Objects';
import { BaseObject } from './Objects/BaseObject';
import { isNamedObject } from './Objects/NamedObject';
import { isSerializedFile, SerializedFile } from './SerializedFile';
import glob from 'fast-glob';
import { isSprite } from './Objects/Sprite';

export class AssetManager {
  protected readonly assetFiles = new Map<string, SerializedFile>();
  protected readonly resourceFiles = new Map<string, BundleFile>();
  readonly resourceFileReaders = new Map<string, EndianReader>();
  readonly namedObjects = new Map<string, BaseObject>();

  async loadFiles(rootdir: string, assetDirGlobs: string[], assetGlobs: string[]): Promise<void> {
    const assetDirectories = await glob(assetDirGlobs, { cwd: rootdir, onlyDirectories: true });
    let bundleDirs: string[] = [];
    for (const assetDir of assetDirectories) {
      const dirs = await glob(assetGlobs, { cwd: path.join(rootdir, assetDir), onlyDirectories: true });
      bundleDirs.push(...dirs.map((dir) => path.join(rootdir, assetDir, dir)));
    }
    const jobs: Promise<void>[] = [];
    for (const dir of bundleDirs) {
      const [bundlePrefix] = path.basename(dir).split('_');
      const bundleFiles = await glob(['**/__data', '**/*.unity3d'], { cwd: dir });
      for (const file of bundleFiles) {
        jobs.push(this.loadFile(path.join(dir, file), undefined, bundlePrefix));
      }
    }
    const results = await Promise.allSettled(jobs);
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length) {
      console.warn(`Failed to load ${failures.length} bundles.`);
    }
  }

  async loadFile(filePath: string, buffer?: Buffer, bundlePrefix?: string) {
    if (!buffer) {
      buffer = await fs.promises.readFile(filePath);
    }
    const reader = EndianReader.fromBuffer(buffer);
    const bundle = await BundleFile.create(reader);
    for (const file of bundle.files) {
      const reader = EndianReader.fromBuffer(file.buffer);
      if (isSerializedFile(reader)) {
        const containerName = path.join(filePath, file.name);
        const assetFile = new SerializedFile(this, file.name, reader, bundlePrefix);
        assetFile.setVersion(bundle.header.unityVersion[1]);
        this.assetFiles.set(containerName, assetFile);
      } else {
        this.resourceFileReaders.set(file.name, reader);
      }
    }
    this.resourceFiles.set(filePath, bundle);
  }

  public loadAssets() {
    for (const [_containerKey, assetFile] of this.assetFiles.entries()) {
      for (const objectInfo of assetFile.objectInfos) {
        const reader = new ObjectReader(assetFile.reader, assetFile, objectInfo);
        const object = createObject(objectInfo.classId, reader);
        assetFile.objects.set(objectInfo.pathId, object);
        if (isNamedObject(object)) {
          let name = object.name;
          // sprites may have name collisions, and won't be referenced by other resources
          if (isSprite(object)) {
            name = [assetFile.bundlePrefix, object.name].filter(Boolean).join('/');
          }
          this.namedObjects.set(name, object);
        }
      }
    }
  }
}
