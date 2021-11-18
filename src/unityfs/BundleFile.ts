import path from 'path';
import { SmartBuffer } from 'smart-buffer';
import { EndianReader } from './EndianReader';
import { assert } from '../utils/Assert';

const lz4: {
  decodeBlock(input: Buffer, output: Buffer, startIdx?: number, endIdx?: number): number;
} = require('lz4');
const lzma = require('lzma/src/lzma_worker').LZMA_WORKER;

interface Size {
  compressed: number;
  uncompressed: number;
}

interface UnityFSHeader {
  signature: string;
  version: number;
  unityVersion: [verison: string, revision: string];
  blocksInfoSize: Size;
  size: bigint;
  flags: number;
}

interface StorageBlock {
  size: Size;
  flags: number;
}

interface Node {
  offset: bigint;
  size: bigint;
  flags: number;
  path: string;
}

interface BlocksInfo {
  blocks: StorageBlock[];
  nodes: Node[];
}

export interface StreamFile {
  name: string;
  buffer: Buffer;
}

export class BundleFile {
  private blocksStream!: SmartBuffer;
  public header!: UnityFSHeader;
  private blocksInfo!: BlocksInfo;
  public files!: StreamFile[];
  private constructor(private readonly reader: EndianReader) {}

  static async create(reader: EndianReader): Promise<BundleFile> {
    const file = new BundleFile(reader);
    await file.init();
    return file;
  }

  async init() {
    this.header = this.readHeader();
    this.blocksInfo = this.readBlocksInfo();
    this.blocksStream = await this.readBlocksStream();
    this.files = this.readFiles();
  }

  private readFiles(): StreamFile[] {
    const files: StreamFile[] = [];
    for (const node of this.blocksInfo.nodes) {
      const name = path.basename(node.path);
      const buffer = this.blocksStream.internalBuffer.slice(Number(node.offset), Number(node.offset + node.size));
      files.push({ name, buffer });
    }
    return files;
  }

  private async readBlocksStream() {
    const uncompressedSize = this.blocksInfo.blocks.reduce((sum, value) => sum + value.size.uncompressed, 0);
    const blocksStream = SmartBuffer.fromBuffer(Buffer.alloc(uncompressedSize));
    for (const block of this.blocksInfo.blocks) {
      const blockBuffer = this.reader.readBuffer(block.size.compressed);
      switch (
        block.flags & 0x3f // kStorageBlockCompressionTypeMask
      ) {
        case 1:
          // const headerBuf = blockBuffer.slice(0, 5);
          // const dataBuffer = blockBuffer.slice(13);
          // const bufsize = dataBuffer.length;
          const result = Buffer.from(lzma.decompress(blockBuffer) as number[]);
          assert(result.length === block.size.uncompressed);
          blocksStream.writeBuffer(result);
          break;
        case 2:
        case 3: {
          const decodedSize = lz4.decodeBlock(blockBuffer, blocksStream.internalBuffer.slice(blocksStream.writeOffset));
          blocksStream.writeOffset += decodedSize;
          assert(decodedSize === block.size.uncompressed);
          break;
        }
        default: {
          this.reader.writeBuffer(blockBuffer);
          // None
          break;
        }
      }
    }
    blocksStream.readOffset = 0;
    return blocksStream;
  }

  private alignStream(alignment: number): void {
    const pos = this.reader.readOffset;
    const mod = pos % alignment;
    if (mod !== 0) {
      this.reader.readOffset += alignment - mod;
    }
  }

  private readBlocksInfo(): BlocksInfo {
    const stream = this.getBlocksInfoStream();
    const reader = EndianReader.fromBuffer(stream);
    reader.readOffset += 16; // uncompressedDataHash
    const blocksInfoCount = reader.readInt32();
    const blocks: StorageBlock[] = [];
    for (let n = 0; n < blocksInfoCount; ++n) {
      blocks.push({
        size: { uncompressed: reader.readUInt32(), compressed: reader.readUInt32() },
        flags: reader.readUInt16(),
      });
    }

    const nodesCount = reader.readInt32();
    const nodes: Node[] = [];
    for (let n = 0; n < nodesCount; ++n) {
      nodes.push({
        offset: reader.readInt64(),
        size: reader.readInt64(),
        flags: reader.readUInt32(),
        path: reader.readStringNT(),
      });
    }
    return { blocks, nodes };
  }

  private getBlocksInfoStream(): Buffer {
    let blocksInfoCompressedStream: Buffer;
    let blocksInfoUncompressedStream: Buffer;
    if (this.header.version >= 7) {
      this.alignStream(16);
    }
    if (this.header.flags & 0x80) {
      // kArchiveBlocksInfoAtTheEnd
      blocksInfoCompressedStream = this.reader.internalBuffer.slice(
        this.reader.length - this.header.blocksInfoSize.compressed,
        this.reader.length
      );
    } else {
      // 0x40 kArchiveBlocksAndDirectoryInfoCombined
      blocksInfoCompressedStream = this.reader.readBuffer(this.header.blocksInfoSize.compressed);
    }
    // kArchiveCompressionTypeMask
    switch (this.header.flags & 0x3f) {
      default: {
        // None
        blocksInfoUncompressedStream = blocksInfoCompressedStream;
        break;
      }
      case 1: {
        blocksInfoUncompressedStream = Buffer.from(lzma.decompress(blocksInfoCompressedStream) as number[]);
        break;
      }
      case 2: // LZ4
      case 3: {
        // LZ4HC
        blocksInfoUncompressedStream = Buffer.alloc(this.header.blocksInfoSize.uncompressed);
        const decodedSize = lz4.decodeBlock(blocksInfoCompressedStream, blocksInfoUncompressedStream);
        assert(decodedSize === this.header.blocksInfoSize.uncompressed);
        break;
      }
    }
    return blocksInfoUncompressedStream!;
  }

  private readHeader(): UnityFSHeader {
    const signature = this.reader.readStringNT();
    const version = this.reader.readUInt32();
    const unityVersion: [string, string] = [this.reader.readStringNT(), this.reader.readStringNT()];
    switch (signature) {
      case 'UnityWeb':
      case 'UnityRaw':
        if (version != 6) {
          throw new Error(`Archive type not supported: '${signature}'`);
        }
      case 'UnityFS':
        const size = this.reader.readInt64();
        const blocksInfoSize = { compressed: this.reader.readUInt32(), uncompressed: this.reader.readUInt32() };
        const flags = this.reader.readUInt32();
        if (signature != 'UnityFS') {
          this.reader.readInt8();
        }
        return { signature, version, unityVersion, blocksInfoSize, size, flags };
    }
    throw new Error(`Internal error reading header`);
  }
}
