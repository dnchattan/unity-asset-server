import { SerializedFile } from './SerializedFile';
import path from 'path';
import { EndianReader } from './EndianReader';
import { assert } from '../utils/Assert';

export class ResourceReader {
  private needSearch = false;
  private readonly path?: string;
  private readonly assetFile?: SerializedFile;
  private readonly offset: number | bigint;
  private readonly size: number;
  private reader?: EndianReader;
  constructor(path: string, assetFile: SerializedFile, offset: number | bigint, size: number);
  constructor(reader: EndianReader, offset: number | bigint, size: number);
  constructor(
    ...args:
      | [path: string, assetFile: SerializedFile, offset: number | bigint, size: number]
      | [reader: EndianReader, offset: number | bigint, size: number]
  ) {
    if (args.length === 4) {
      const [path, assetFile, offset, size] = args;
      this.path = path;
      this.assetFile = assetFile;
      this.offset = offset;
      this.size = size;
      this.needSearch = true;
    } else {
      const [reader, offset, size] = args;
      this.reader = reader;
      this.offset = offset;
      this.size = size;
      this.needSearch = false;
    }
  }

  getData(): Buffer {
    assert(this.assetFile && this.path);
    if (this.needSearch) {
      const resourceFileName = path.basename(this.path);
      this.reader = this.assetFile.assetManager.resourceFileReaders.get(resourceFileName);
      if (!this.reader) {
        throw new Error(`Can't find the resource file ${resourceFileName}`);
      }
      this.needSearch = false;
    }

    assert(this.reader);
    this.reader.readOffset = Number(this.offset);
    return this.reader.readBuffer(this.size);
  }
}
