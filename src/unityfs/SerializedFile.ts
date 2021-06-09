import { SmartBuffer } from 'smart-buffer';
import type { AssetManager } from './AssetManager';
import { BuildTarget } from './BuildTarget';
import { BuildType } from './BuildType';
import { ClassIDType } from './ClassIdType';
import { commonStringMap } from './CommonString';
import { EndianReader, EndianType } from './EndianReader';
import { BaseObject } from './Objects/BaseObject';
import { makeVersion, Version } from './VersionTuple';

interface SerializedFileHeader {
  metadataSize: number;
  fileSize: number | bigint;
  version: number;
  dataOffset: number | bigint;
  endianness: number;
}

export interface TypeTreeNode {
  type: string;
  name: string;
  byteSize: number;
  index?: number;
  isArray: boolean;
  version: number;
  metaFlag?: number;
  level: number;
}

export interface ObjectInfo {
  byteStart: number | bigint;
  byteSize: number;
  typeId: number;
  classId: ClassIDType;
  pathId: number | bigint;
  serializedType?: SerializedType;
}

export interface TypeTreeNodeBlob extends TypeTreeNode {
  typeStrOffset: number;
  nameStrOffset: number;
}

export interface SerializedType {
  classId: ClassIDType;
  isStrippedType?: boolean;
  scriptTypeIndex?: number;
  scriptId?: Buffer; // hash128
  oldTypeHash?: Buffer; // hash128
  nodes?: TypeTreeNode[];
  typeDependencies?: number[];
}

export function isSerializedFile(reader: EndianReader): boolean {
  const bufferSize = reader.length;
  if (bufferSize < 20) {
    return false;
  }
  reader.readUInt32(); // metadataSize
  let fileSize: number | bigint = reader.readUInt32();
  const version = reader.readUInt32();
  let dataOffset: number | bigint = reader.readUInt32();
  reader.readInt8(); //endianness
  reader.readBuffer(3); // reserved
  if (version >= 22) {
    if (fileSize < 48) {
      return false;
    }
    reader.readUInt32(); // metadataSize
    fileSize = reader.readInt64();
    dataOffset = reader.readInt64();
  }

  reader.readOffset = 0;

  if (BigInt(fileSize) !== BigInt(bufferSize)) {
    return false;
  }
  if (dataOffset > fileSize) {
    return false;
  }

  return true;
}

export class SerializedFile {
  private enableTypeTree: boolean = true;
  private bigIDEnabled: boolean = false;

  public readonly header: SerializedFileHeader;
  public readonly reader: EndianReader;
  public version: Version = makeVersion();
  public unityVersion: string = '2.5.0f5';
  public targetPlatform: BuildTarget = BuildTarget.UnknownPlatform; // unknown
  public readonly types: SerializedType[];
  public readonly objectInfos: ObjectInfo[];
  public readonly objects = new Map<number | bigint, BaseObject>();
  public buildType: BuildType = BuildType.None;

  constructor(
    readonly assetManager: AssetManager,
    readonly name: string,
    reader: EndianReader,
    readonly bundlePrefix?: string
  ) {
    this.reader = reader;
    this.header = this.readHeader();
    this.readMetadata();
    this.types = this.readTypes();
    this.objectInfos = this.readObjects();
    // TODO: Read externals
    // TODO: Read ref types
    // TODO: Read userinformation stub(?)
  }

  public setVersion(version: string): void {
    const buildFlag = version.replace(/[\d\.]/g, '');
    if (buildFlag === BuildType.Alpha || buildFlag === BuildType.Patch) {
      this.buildType = buildFlag;
    } else {
      this.buildType = BuildType.None;
    }
    this.version = makeVersion(
      ...version
        .replace(/\D/g, '.')
        .split('.')
        .filter(Boolean)
        .map((part) => parseInt(part, 10))
    );
  }

  private readHeader(): SerializedFileHeader {
    let metadataSize = this.reader.readUInt32();
    let fileSize: bigint | number = this.reader.readUInt32();
    let version = this.reader.readUInt32();
    let dataOffset: bigint | number = this.reader.readUInt32();
    let endianness: number;
    if (version >= 9) {
      endianness = this.reader.readUInt8() as EndianType;
      this.reader.readOffset += 3; // reserved[3]
    } else {
      this.reader.readOffset = fileSize - metadataSize;
      endianness = this.reader.readUInt8() as EndianType;
    }

    if (version >= 22) {
      metadataSize = this.reader.readUInt32();
      fileSize = this.reader.readInt64();
      dataOffset = this.reader.readInt64();
      this.reader.readInt64(); // unknown
    }

    this.reader.endianness = endianness;
    return { metadataSize, fileSize, version, dataOffset, endianness };
  }

  private readMetadata() {
    if (this.header.version >= 7) {
      this.unityVersion = this.reader.readStringNT();
      this.setVersion(this.unityVersion);
    }
    if (this.header.version >= 8) {
      this.targetPlatform = this.reader.readInt32();
    }
    if (this.header.version >= 13) {
      this.enableTypeTree = this.reader.readBoolean();
    }
  }

  private readTypes(): SerializedType[] {
    const typeCount = this.reader.readInt32();
    const types: SerializedType[] = [];
    for (let n = 0; n < typeCount; ++n) {
      types.push(this.readSerializedType());
    }
    if (this.header.version >= 7 && this.header.version < 14) {
      this.bigIDEnabled = !!this.reader.readInt32();
    }
    return types;
  }

  private readSerializedType(): SerializedType {
    const classId: ClassIDType = this.reader.readInt32();
    const type: SerializedType = {
      classId,
    };
    if (this.header.version >= 16) {
      type.isStrippedType = this.reader.readBoolean();
    }
    if (this.header.version >= 17) {
      type.scriptTypeIndex = this.reader.readInt16();
    }
    if (this.header.version >= 13) {
      if ((this.header.version > 16 && classId < 0) || (this.header.version >= 16 && classId === 114)) {
        type.scriptId = this.reader.readBuffer(16);
      }
      type.oldTypeHash = this.reader.readBuffer(16);
    }

    if (this.enableTypeTree) {
      if (this.header.version >= 12 || this.header.version === 10) {
        type.nodes = this.typeTreeBlobRead();
      } else {
        type.nodes = this.readTypeTree([]);
      }
      if (this.header.version >= 21) {
        type.typeDependencies = this.reader.readArray('readInt32');
      }
    }

    return type;
  }

  private typeTreeBlobRead(): TypeTreeNode[] {
    const numberOfNodes = this.reader.readInt32();
    const stringBufferSize = this.reader.readInt32();
    const nodes: TypeTreeNodeBlob[] = [];
    for (let n = 0; n < numberOfNodes; ++n) {
      const version = this.reader.readUInt16();
      const level = this.reader.readInt8();
      const isArray = this.reader.readBoolean();
      const typeStrOffset = this.reader.readUInt32();
      const nameStrOffset = this.reader.readUInt32();
      const byteSize = this.reader.readInt32();
      const index = this.reader.readInt32();
      const metaFlag = this.reader.readInt32();
      if (this.header.version >= 19) {
        this.reader.readUInt64(); // refTypeHash
      }
      nodes.push({
        level,
        version,
        isArray,
        typeStrOffset,
        nameStrOffset,
        byteSize,
        index,
        metaFlag,
      } as TypeTreeNodeBlob);
    }
    const stringBuffer = SmartBuffer.fromBuffer(this.reader.readBuffer(stringBufferSize));

    function readString(value: number): string {
      const isOffset = (value & 0x80000000) == 0;
      if (isOffset) {
        stringBuffer.readOffset = value;
        return stringBuffer.readStringNT();
      }
      const offset = value & 0x7fffffff;
      return commonStringMap[offset] ?? offset.toString();
    }

    for (const node of nodes) {
      node.type = readString(node.typeStrOffset);
      node.name = readString(node.nameStrOffset);
    }
    return nodes;
  }

  private readTypeTree(nodes: TypeTreeNode[], level: number = 0): TypeTreeNode[] {
    const type = this.reader.readStringNT();
    const name = this.reader.readStringNT();
    const byteSize = this.reader.readInt32();
    let index: number | undefined;
    if (this.header.version === 2) {
      this.reader.readInt32(); // variableCount
    }
    if (this.header.version !== 3) {
      index = this.reader.readInt32();
    }
    const isArray = !!this.reader.readInt32();
    const version = this.reader.readInt32();
    let metaFlag: number | undefined;
    if (this.header.version !== 3) {
      metaFlag = this.reader.readInt32();
    }
    nodes.push({
      level,
      type,
      name,
      byteSize,
      index,
      isArray,
      version,
      metaFlag,
    });
    const childrenCount = this.reader.readInt32();
    for (let n = 0; n < childrenCount; ++n) {
      this.readTypeTree(nodes, level + 1);
    }
    return nodes;
  }

  private readObjects(): ObjectInfo[] {
    const objectCount = this.reader.readInt32();
    const objects: ObjectInfo[] = [];
    for (let n = 0; n < objectCount; ++n) {
      let pathId: number | bigint;
      if (this.bigIDEnabled) {
        pathId = this.reader.readInt64();
      } else if (this.header.version < 14) {
        pathId = this.reader.readInt32();
      } else {
        this.reader.alignStream();
        pathId = this.reader.readInt64();
      }

      let byteStart: bigint | number;
      if (this.header.version >= 22) {
        byteStart = this.reader.readInt64();
      } else {
        byteStart = this.reader.readUInt32();
      }

      // @ts-ignore
      byteStart += this.header.dataOffset;
      const byteSize = this.reader.readUInt32();
      const typeId = this.reader.readInt32();
      let classId: ClassIDType;
      let serializedType: SerializedType | undefined;
      if (this.header.version < 16) {
        classId = this.reader.readUInt16();
        serializedType = this.types.find((type) => type.classId === classId);
      } else {
        serializedType = this.types[typeId];
        classId = serializedType.classId;
      }
      if (this.header.version < 11) {
        this.reader.readUInt16(); // isDestroyed
      }
      if (this.header.version >= 11 && this.header.version < 17) {
        const scriptTypeIndex = this.reader.readInt16();
        if (serializedType) {
          serializedType.scriptTypeIndex = scriptTypeIndex;
        }
      }
      if (this.header.version === 15 || this.header.version === 16) {
        this.reader.readInt8(); // stripped
      }
      objects.push({
        typeId,
        classId,
        pathId,
        byteStart,
        byteSize,
        serializedType,
      });
    }
    return objects;
  }
}
