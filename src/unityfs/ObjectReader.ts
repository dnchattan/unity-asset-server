import { BuildTarget } from './BuildTarget';
import { BuildType } from './BuildType';
import { ClassIDType } from './ClassIdType';
import { EndianReader } from './EndianReader';
import { ObjectInfo, SerializedFile } from './SerializedFile';
import { Version } from './VersionTuple';

export class ObjectReader extends EndianReader {
  public readonly version: Version;
  public readonly buildType: BuildType;
  public readonly fileVersion: number;
  public readonly platform: BuildTarget;
  public readonly classId: ClassIDType;
  public readonly pathId: number | bigint;

  constructor(
    reader: EndianReader,
    public readonly assetsFile: SerializedFile,
    public readonly objectInfo: ObjectInfo
  ) {
    super({ buff: reader.internalBuffer, endianness: reader.endianness });
    this.version = assetsFile.version;
    this.buildType = assetsFile.buildType;
    this.fileVersion = assetsFile.header.version;
    this.platform = assetsFile.targetPlatform;
    this.classId = objectInfo.classId;
    this.pathId = objectInfo.pathId;
  }

  readObjectArray<T>(Type: { new (reader: ObjectReader): T }): T[] {
    const count = this.readInt32();
    const result: T[] = [];
    for (let n = 0; n < count; ++n) {
      result.push(new Type(this));
    }
    return result;
  }

  readDelegatedArray<T>(delegate: (reader: ObjectReader) => T) {
    const count = this.readInt32();
    const result: T[] = [];
    for (let n = 0; n < count; ++n) {
      result.push(delegate(this));
    }
    return result;
  }

  reset() {
    this.readOffset = Number(this.objectInfo.byteStart);
  }
}
