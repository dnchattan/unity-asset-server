import { ObjectReader } from '../ObjectReader';
import { BaseObject } from './BaseObject';

export class NamedObject extends BaseObject {
  public readonly name: string;
  constructor(reader: ObjectReader) {
    super(reader);
    this.name = reader.readAlignedString();
  }
}

export function isNamedObject(obj: BaseObject): obj is NamedObject {
  return (obj as NamedObject).name !== undefined;
}
