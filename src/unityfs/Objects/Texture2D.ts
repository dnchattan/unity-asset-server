import { ClassIDType } from '../ClassIdType';
import { ObjectReader } from '../ObjectReader';
import { ResourceReader } from '../ResourceReader';
import { makeVersion } from '../VersionTuple';
import { BaseObject } from './BaseObject';
import { NamedObject } from './NamedObject';

export enum TextureFormat {
  Alpha8 = 1,
  ARGB4444,
  RGB24,
  RGBA32,
  ARGB32,
  RGB565 = 7,
  R16 = 9,
  DXT1,
  DXT5 = 12,
  RGBA4444,
  BGRA32,
  RHalf,
  RGHalf,
  RGBAHalf,
  RFloat,
  RGFloat,
  RGBAFloat,
  YUY2,
  RGB9e5Float,
  BC4 = 26,
  BC5,
  BC6H = 24,
  BC7,
  DXT1Crunched = 28,
  DXT5Crunched,
  PVRTC_RGB2,
  PVRTC_RGBA2,
  PVRTC_RGB4,
  PVRTC_RGBA4,
  ETC_RGB4,
  ATC_RGB4,
  ATC_RGBA8,
  EAC_R = 41,
  EAC_R_SIGNED,
  EAC_RG,
  EAC_RG_SIGNED,
  ETC2_RGB,
  ETC2_RGBA1,
  ETC2_RGBA8,
  ASTC_RGB_4x4,
  ASTC_RGB_5x5,
  ASTC_RGB_6x6,
  ASTC_RGB_8x8,
  ASTC_RGB_10x10,
  ASTC_RGB_12x12,
  ASTC_RGBA_4x4,
  ASTC_RGBA_5x5,
  ASTC_RGBA_6x6,
  ASTC_RGBA_8x8,
  ASTC_RGBA_10x10,
  ASTC_RGBA_12x12,
  ETC_RGB4_3DS,
  ETC_RGBA8_3DS,
  RG16,
  R8,
  ETC_RGB4Crunched,
  ETC2_RGBA8Crunched,
  ASTC_HDR_4x4,
  ASTC_HDR_5x5,
  ASTC_HDR_6x6,
  ASTC_HDR_8x8,
  ASTC_HDR_10x10,
  ASTC_HDR_12x12,
}

export class Texture extends NamedObject {
  constructor(reader: ObjectReader) {
    super(reader);
    if (this.version >= makeVersion(2017, 3)) {
      //2017.3+
      reader.readInt32(); // forcedFallbackFormat
      reader.readBoolean(); // downscaleFallback
      if (this.version >= makeVersion(2020, 2)) {
        //2020.2+
        reader.readBoolean(); // isAlphaChannelOptional
      }
      reader.alignStream();
    }
  }
}

export class GLTextureSettings {
  readonly filterMode: number;
  readonly aniso: number;
  readonly mipBias: number;
  readonly wrapMode: number;

  constructor(reader: ObjectReader) {
    const version = reader.version;

    this.filterMode = reader.readInt32();
    this.aniso = reader.readInt32();
    this.mipBias = reader.readSingle();
    if (version >= makeVersion(2017)) {
      //2017.x and up
      this.wrapMode = reader.readInt32(); // m_WrapU
      reader.readInt32(); // m_WrapV
      reader.readInt32(); // m_WrapW
    } else {
      this.wrapMode = reader.readInt32();
    }
  }
}

export class StreamingInfo {
  readonly offset: number | bigint;
  readonly size: number;
  readonly path: string;

  constructor(reader: ObjectReader) {
    const version = reader.version;

    if (version >= makeVersion(2020)) {
      // 2020.1+
      this.offset = reader.readUInt64();
    } else {
      this.offset = reader.readUInt32();
    }
    this.size = reader.readUInt32();
    this.path = reader.readAlignedString();
  }
}

export class Texture2D extends Texture {
  readonly width: number;
  readonly height: number;
  readonly textureFormat: TextureFormat;
  readonly mipMap?: boolean;
  readonly mipCount?: number;
  readonly textureSettings: GLTextureSettings;
  readonly streamData?: StreamingInfo;
  readonly resourceReader: ResourceReader;

  constructor(reader: ObjectReader) {
    super(reader);
    this.width = reader.readInt32();
    this.height = reader.readInt32();
    reader.readInt32(); // completeImageSize
    if (this.version >= makeVersion(2020)) {
      // 2020.1+
      reader.readInt32(); //mipsStripped
    }
    this.textureFormat = reader.readInt32();
    if (this.version < makeVersion(5, 2)) {
      this.mipMap = reader.readBoolean();
    } else {
      this.mipCount = reader.readInt32();
    }
    if (this.version >= makeVersion(2, 6)) {
      //2.6.0 and up
      reader.readBoolean(); // m_IsReadable
    }
    if (this.version >= makeVersion(2020)) {
      //2020.1 and up
      reader.readBoolean(); // m_IsPreProcessed
    }
    if (this.version >= makeVersion(2019, 3)) {
      //2019.3 and up
      reader.readBoolean(); // m_IgnoreMasterTextureLimit
    }
    if (this.version >= makeVersion(3) && this.version <= makeVersion(5, 4)) {
      //3.0.0 - 5.4
      reader.readBoolean(); // m_ReadAllowed
    }
    if (this.version >= makeVersion(2018, 2)) {
      //2018.2 and up
      reader.readBoolean(); // m_StreamingMipmaps
    }
    reader.alignStream();
    if (this.version >= makeVersion(2018, 2)) {
      //2018.2 and up
      reader.readInt32(); // m_StreamingMipmapsPriority
    }
    reader.readInt32(); // m_ImageCount
    reader.readInt32(); // m_TextureDimension
    this.textureSettings = new GLTextureSettings(reader);
    if (this.version >= makeVersion(3)) {
      //3.0 and up
      reader.readInt32(); // m_LightmapFormat
    }
    if (this.version >= makeVersion(3, 5)) {
      //3.5.0 and up
      reader.readInt32(); // m_ColorSpace
    }
    if (this.version >= makeVersion(2020, 2)) {
      //2020.2 and up
      reader.readArray('readUInt8'); // m_PlatformBlob
      reader.alignStream();
    }
    const imageDataSize = reader.readInt32();
    if (imageDataSize == 0 && this.version > makeVersion(5, 3)) {
      //5.3.0 and up
      this.streamData = new StreamingInfo(reader);
    }

    if (this.streamData && this.streamData.path) {
      this.resourceReader = new ResourceReader(
        this.streamData?.path,
        reader.assetsFile,
        this.streamData.offset,
        this.streamData.size
      );
    } else {
      this.resourceReader = new ResourceReader(reader, reader.readOffset, imageDataSize);
    }
  }
}

export function isTexture(obj: BaseObject): obj is Texture {
  return obj.classId === ClassIDType.Texture || obj.classId === ClassIDType.Texture2D;
}

export function isTexture2D(obj: BaseObject): obj is Texture2D {
  return obj.classId === ClassIDType.Texture2D;
}
