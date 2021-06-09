import { BuildType } from '../BuildType';
import { EndianReader } from '../EndianReader';
import { ObjectReader } from '../ObjectReader';
import { PPtr } from './PPtr';
import { makeVersion } from '../VersionTuple';
import { Matrix4x4, readMatrix4x4 } from './Matrix';
import { BoneWeights4, SubMesh, VertexData } from './Mesh';
import { NamedObject } from './NamedObject';
import { Texture2D } from './Texture2D';
import { Vector2, Vector4, readVector2, readVector4, Vector3, readVector3 } from './Vector';
import { BaseObject } from './BaseObject';
import { ClassIDType } from '../ClassIdType';

export enum SpritePackingRotation {
  kSPRNone = 0,
  kSPRFlipHorizontal = 1,
  kSPRFlipVertical = 2,
  kSPRRotate180 = 3,
  kSPRRotate90 = 4,
}

export enum SpritePackingMode {
  kSPMTight = 0,
  kSPMRectangle,
}

export enum SpriteMeshType {
  kSpriteMeshTypeFullRect,
  kSpriteMeshTypeTight,
}

export class Rectf {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(reader: EndianReader) {
    this.x = reader.readSingle();
    this.y = reader.readSingle();
    this.width = reader.readSingle();
    this.height = reader.readSingle();
  }
}

export class SecondarySpriteTexture {
  readonly texture: PPtr<Texture2D>;
  readonly name: string;

  constructor(reader: ObjectReader) {
    this.texture = new PPtr(reader, Texture2D);
    this.name = reader.readStringNT();
  }
}

export class SpriteSettings {
  readonly settingsRaw: number;

  readonly packed: number;
  readonly packingMode: SpritePackingMode;
  readonly packingRotation: SpritePackingRotation;
  readonly meshType: SpriteMeshType;

  constructor(reader: ObjectReader) {
    this.settingsRaw = reader.readUInt32();

    this.packed = this.settingsRaw & 1; //1
    this.packingMode = (this.settingsRaw >> 1) & 1; //1
    this.packingRotation = (this.settingsRaw >> 2) & 0xf; //4
    this.meshType = (this.settingsRaw >> 6) & 1; //1
    //reserved
  }
}
export class SpriteVertex {
  readonly pos: Vector3;
  readonly uv?: Vector2;

  constructor(reader: ObjectReader) {
    var version = reader.version;

    this.pos = readVector3(reader);
    if (version <= makeVersion(4, 3)) {
      //4.3 and down
      this.uv = readVector2(reader);
    }
  }
}

export class SpriteRenderData {
  readonly texture: PPtr<Texture2D>;
  readonly alphaTexture?: PPtr<Texture2D>;
  readonly seconaryTextures?: SecondarySpriteTexture[];
  readonly subMeshes?: SubMesh[];
  readonly indexBuffer?: number[];
  readonly vertexData?: VertexData;
  readonly vertices?: SpriteVertex[];
  readonly indices?: number[];
  readonly bindPose?: Matrix4x4[];
  readonly sourceSkin?: BoneWeights4[];
  readonly textureRect: Rectf;
  readonly textureRectOffset: Vector2;
  readonly atlasRectOffset?: Vector2;
  readonly settingsRaw: SpriteSettings;
  readonly uvTransform?: Vector4;
  readonly downscaleMultiplier?: number;

  constructor(reader: ObjectReader) {
    const version = reader.version;
    this.texture = new PPtr(reader, Texture2D);
    if (version >= makeVersion(5, 2)) {
      this.alphaTexture = new PPtr(reader, Texture2D);
    }

    if (version >= makeVersion(2019)) {
      this.seconaryTextures = reader.readObjectArray(SecondarySpriteTexture);
    }

    if (version >= makeVersion(5, 6)) {
      this.subMeshes = reader.readObjectArray(SubMesh);
      this.indexBuffer = reader.readArray('readUInt8');
      reader.alignStream();
      this.vertexData = new VertexData(reader);
    } else {
      this.vertices = reader.readObjectArray(SpriteVertex);
      this.indices = reader.readArray('readUInt16');
      reader.alignStream();
    }

    if (version > makeVersion(2018)) {
      this.bindPose = reader.readDelegatedArray(readMatrix4x4);

      if (version <= makeVersion(2018, 2)) {
        this.sourceSkin = reader.readObjectArray(BoneWeights4);
      }
    }

    this.textureRect = new Rectf(reader);
    this.textureRectOffset = readVector2(reader);
    if (version >= makeVersion(5, 6)) {
      this.atlasRectOffset = readVector2(reader);
    }

    this.settingsRaw = new SpriteSettings(reader);
    if (version >= makeVersion(4, 5)) {
      this.uvTransform = readVector4(reader);
    }
    if (version >= makeVersion(2017)) {
      this.downscaleMultiplier = reader.readSingle();
    }
  }
}

export class SpriteAtlas {
  constructor(reader: ObjectReader) {}
}

export class Sprite extends NamedObject {
  readonly rect: Rectf;
  readonly offset: Vector2;
  readonly border?: Vector4;
  readonly pixelsToUnits: number;
  readonly pivot?: Vector2;
  readonly extrude: number;
  readonly isPolygon?: boolean;
  readonly renderDataKey?: (bigint | Buffer)[];
  readonly atlasTags?: string[];
  readonly spriteAtlas?: PPtr<SpriteAtlas>;
  readonly spriteRenderData: SpriteRenderData;
  readonly physicsShape?: Vector2[][];

  constructor(reader: ObjectReader) {
    super(reader);
    this.rect = new Rectf(reader);
    this.offset = readVector2(reader);
    if (this.version >= makeVersion(4, 5)) {
      this.border = readVector4(reader);
    }

    this.pixelsToUnits = reader.readSingle();
    if (
      this.version >= makeVersion(5, 4, 2) ||
      (this.version >= makeVersion(5, 4, 1, 3) && this.buildType === BuildType.Patch)
    ) {
      this.pivot = readVector2(reader);
    }

    this.extrude = reader.readUInt32();
    if (this.version >= makeVersion(5, 3)) {
      this.isPolygon = reader.readBoolean();
      reader.alignStream();
    }

    if (this.version >= makeVersion(2017)) {
      this.renderDataKey = [reader.readBuffer(16), reader.readInt64()];
      this.atlasTags = reader.readArray('readAlignedString');
      this.spriteAtlas = new PPtr(reader, SpriteAtlas);
    }

    this.spriteRenderData = new SpriteRenderData(reader);

    if (this.version >= makeVersion(2017)) {
      this.physicsShape = reader.readDelegatedArray((reader) => reader.readDelegatedArray(readVector2));
    }
  }
}

export function isSprite(obj: BaseObject): obj is Sprite {
  return obj.classId === ClassIDType.Sprite;
}
