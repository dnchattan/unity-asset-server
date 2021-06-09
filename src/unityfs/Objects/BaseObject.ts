import { BuildTarget } from '../BuildTarget';
import { BuildType } from '../BuildType';
import { ClassIDType } from '../ClassIdType';
import { ObjectReader } from '../ObjectReader';
import { Version } from '../VersionTuple';

export class BaseObject {
  protected readonly version: Version;
  protected readonly buildType: BuildType;
  protected readonly platform: BuildTarget;
  public readonly classId: ClassIDType;
  public readonly pathId: number | bigint;
  constructor(reader: ObjectReader) {
    reader.reset();
    this.version = reader.version;
    this.buildType = reader.buildType;
    this.platform = reader.platform;
    this.classId = reader.classId;
    this.pathId = reader.pathId;
    if (this.platform === BuildTarget.NoTarget) {
      reader.readUInt32();
    }
  }
}
