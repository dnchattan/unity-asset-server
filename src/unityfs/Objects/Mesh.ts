import { ObjectReader } from '../ObjectReader';
import { makeVersion } from '../VersionTuple';
import { readVector3, Vector3 } from './Vector';

export enum GfxPrimitiveType {
  kPrimitiveTriangles = 0,
  kPrimitiveTriangleStrip = 1,
  kPrimitiveQuads = 2,
  kPrimitiveLines = 3,
  kPrimitiveLineStrip = 4,
  kPrimitivePoints = 5,
}

export class AABB {
  readonly center: Vector3;
  readonly extent: Vector3;

  constructor(reader: ObjectReader) {
    this.center = readVector3(reader);
    this.extent = readVector3(reader);
  }
}

export class StreamInfo {
  readonly channelMask: number;
  readonly offset: number;
  readonly stride: number;
  readonly align?: number;
  readonly dividerOp?: number;
  readonly frequency?: number;

  constructor(reader: ObjectReader) {
    const version = reader.version;

    this.channelMask = reader.readUInt32();
    this.offset = reader.readUInt32();

    if (version < makeVersion(4)) {
      //4.0 down
      this.stride = reader.readUInt32();
      this.align = reader.readUInt32();
    } else {
      this.stride = reader.readInt8();
      this.dividerOp = reader.readInt8();
      this.frequency = reader.readUInt16();
    }
  }
}

export class ChannelInfo {
  readonly stream: number;
  readonly offset: number;
  readonly format: number;
  readonly dimension: number;

  constructor(reader: ObjectReader) {
    this.stream = reader.readInt8();
    this.offset = reader.readInt8();
    this.format = reader.readInt8();
    this.dimension = reader.readInt8() & 0xf;
  }
}

export class BoneWeights4 {
  readonly weight: number[];
  readonly boneIndex: number[];

  constructor(reader: ObjectReader) {
    this.weight = reader.readArray('readSingle', 4);
    this.boneIndex = reader.readArray('readInt32', 4);
  }
}

export class VertexData {
  readonly currentChannels?: number;
  readonly vertexCount: number;
  readonly channels?: ChannelInfo[];
  readonly streams?: StreamInfo[];
  readonly dataSize: number[];

  constructor(reader: ObjectReader) {
    var version = reader.version;

    if (version < makeVersion(2018)) {
      //2018 down
      this.currentChannels = reader.readUInt32();
    }

    this.vertexCount = reader.readUInt32();

    if (version >= makeVersion(4)) {
      //4.0 and up
      const channelsSize = reader.readInt32();
      this.channels = [];
      for (let n = 0; n < channelsSize; ++n) {
        this.channels[n] = new ChannelInfo(reader);
      }
    }

    if (version < makeVersion(5)) {
      //5.0 down
      if (version < makeVersion(4)) {
        this.streams = [];
      } else {
        this.streams = [];
      }

      for (let n = 0; n < this.streams.length; ++n) {
        this.streams[n] = new StreamInfo(reader);
      }

      if (version < makeVersion(4)) {
        //4.0 down
        // TODO
        // this.getChannels(version);
      }
    } //5.0 and up
    else {
      // TODO
      // this.getStreams(version);
    }

    this.dataSize = reader.readArray('readUInt8');
    reader.alignStream();
  }
}

export class SubMesh {
  readonly firstByte: number;
  readonly indexCount: number;
  readonly topology: GfxPrimitiveType;
  readonly triangleCount?: number;
  readonly baseVertex?: number;
  readonly firstVertex?: number;
  readonly vertexCount?: number;
  readonly localAABB: any;

  constructor(reader: ObjectReader) {
    const version = reader.version;
    this.firstByte = reader.readUInt32();
    this.indexCount = reader.readUInt32();
    this.topology = reader.readInt32();

    if (version < makeVersion(4)) {
      this.triangleCount = reader.readUInt32();
    }

    if (version >= makeVersion(2017, 3)) {
      this.baseVertex = reader.readUInt32();
    }

    if (version >= makeVersion(3)) {
      this.firstVertex = reader.readUInt32();
      this.vertexCount = reader.readUInt32();
      this.localAABB = new AABB(reader);
    }
  }
}
