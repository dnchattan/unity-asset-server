import { ClassIDType } from '../ClassIdType';
import { ObjectReader } from '../ObjectReader';
import { BaseObject } from './BaseObject';
import { NamedObject } from './NamedObject';
import { Sprite } from './Sprite';
import { Texture, Texture2D } from './Texture2D';

export const TypeMap: Partial<Record<ClassIDType, typeof BaseObject>> = {
  [ClassIDType.Sprite]: Sprite,
  [ClassIDType.Texture]: Texture,
  [ClassIDType.Texture2D]: Texture2D,
  [ClassIDType.NamedObject]: NamedObject,
};

export function createObject(classId: ClassIDType, reader: ObjectReader): BaseObject {
  return new (TypeMap[classId] ?? BaseObject)(reader);
}
