import { SmartBuffer, SmartBufferOptions } from 'smart-buffer';

export enum EndianType {
  LE,
  BE,
}

export interface EndianReaderOptions extends SmartBufferOptions {
  endianness?: EndianType;
}

export class EndianReader extends SmartBuffer {
  public endianness: EndianType;

  constructor(options?: EndianReaderOptions) {
    super(options);
    this.endianness = options?.endianness ?? EndianType.BE;
  }

  static fromBuffer(buff: Buffer): EndianReader {
    return new EndianReader({ buff });
  }

  alignStream(alignment: number = 4): void {
    const pos = this.readOffset;
    const mod = pos % alignment;
    if (mod !== 0) {
      this.readOffset += alignment - mod;
    }
  }

  readAlignedString(): string {
    const length = this.readInt32();
    if (length > 0 && length <= this.internalBuffer.length - this.readOffset) {
      const result = this.readString(length, 'utf8');
      this.alignStream(4);
      return result;
    }
    return '';
  }

  readArray<T extends keyof this>(
    method: T,
    count?: number
  ): this[T] extends (offset?: number) => infer R ? R[] : never {
    if (typeof this[method] !== 'function') {
      throw new Error('Not a valid read method');
    }
    const result: any[] = [];
    if (count === undefined) {
      count = this.readInt32();
    }
    for (let n = 0; n < count; ++n) {
      result.push((this[method] as any)());
    }
    return result as this[T] extends (offset?: number) => infer R ? R[] : never;
  }

  readBoolean(offset?: number): boolean {
    return !!(this.readInt8(offset) & 1);
  }

  readSingle(offset?: number): number {
    switch (this.endianness) {
      case EndianType.LE:
        return super.readFloatLE(offset);
      case EndianType.BE:
        return super.readFloatBE(offset);
      default:
        throw new Error(`Invalid endianness: ${this.endianness}`);
    }
  }

  readInt16(offset?: number): number {
    switch (this.endianness) {
      case EndianType.LE:
        return super.readInt16LE(offset);
      case EndianType.BE:
        return super.readInt16BE(offset);
      default:
        throw new Error(`Invalid endianness: ${this.endianness}`);
    }
  }

  readUInt16(offset?: number): number {
    switch (this.endianness) {
      case EndianType.LE:
        return super.readUInt16LE(offset);
      case EndianType.BE:
        return super.readUInt16BE(offset);
      default:
        throw new Error(`Invalid endianness: ${this.endianness}`);
    }
  }

  readInt32(offset?: number): number {
    switch (this.endianness) {
      case EndianType.LE:
        return super.readInt32LE(offset);
      case EndianType.BE:
        return super.readInt32BE(offset);
      default:
        throw new Error(`Invalid endianness: ${this.endianness}`);
    }
  }

  readUInt32(offset?: number): number {
    switch (this.endianness) {
      case EndianType.LE:
        return super.readUInt32LE(offset);
      case EndianType.BE:
        return super.readUInt32BE(offset);
      default:
        throw new Error(`Invalid endianness: ${this.endianness}`);
    }
  }

  readInt64(offset?: number): bigint {
    switch (this.endianness) {
      case EndianType.LE:
        return super.readBigInt64LE(offset);
      case EndianType.BE:
        return super.readBigInt64BE(offset);
      default:
        throw new Error(`Invalid endianness: ${this.endianness}`);
    }
  }

  readUInt64(offset?: number): bigint {
    switch (this.endianness) {
      case EndianType.LE:
        return super.readBigUInt64LE(offset);
      case EndianType.BE:
        return super.readBigUInt64BE(offset);
      default:
        throw new Error(`Invalid endianness: ${this.endianness}`);
    }
  }

  readFloat(offset?: number): number {
    switch (this.endianness) {
      case EndianType.LE:
        return super.readFloatLE(offset);
      case EndianType.BE:
        return super.readFloatBE(offset);
      default:
        throw new Error(`Invalid endianness: ${this.endianness}`);
    }
  }

  readDouble(offset?: number): number {
    switch (this.endianness) {
      case EndianType.LE:
        return super.readDoubleLE(offset);
      case EndianType.BE:
        return super.readDoubleBE(offset);
      default:
        throw new Error(`Invalid endianness: ${this.endianness}`);
    }
  }
}
