import { EndianReader } from '../EndianReader';

export type Vector2 = [number, number];
export type Vector3 = [number, number, number];
export type Vector4 = [number, number, number, number];

export function readVector2(reader: EndianReader): Vector2 {
  return [reader.readSingle(), reader.readSingle()];
}

export function readVector3(reader: EndianReader): Vector3 {
  return [reader.readSingle(), reader.readSingle(), reader.readSingle()];
}

export function readVector4(reader: EndianReader): Vector4 {
  return [reader.readSingle(), reader.readSingle(), reader.readSingle(), reader.readSingle()];
}
