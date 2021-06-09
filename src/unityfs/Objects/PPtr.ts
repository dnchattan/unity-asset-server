import { ObjectReader } from '../ObjectReader';
import { SerializedFile } from '../SerializedFile';

export class PPtr<T> {
  readonly fileId: number;
  readonly pathId: number | bigint;
  readonly assetsFile: SerializedFile;

  constructor(reader: ObjectReader, type: { new (reader: ObjectReader): T }) {
    this.fileId = reader.readInt32();
    this.pathId = reader.fileVersion < 14 ? reader.readInt32() : reader.readInt64();
    this.assetsFile = reader.assetsFile;
  }

  private getAssetsFile(): SerializedFile | undefined {
    if (this.fileId === 0) {
      return this.assetsFile;
    }

    // TODO: Implement externals
    throw new Error('Externals not supported');
  }

  get(): T | undefined {
    const file = this.getAssetsFile();
    const obj = file?.objects.get(this.pathId);
    return obj as T | undefined;
  }
}
