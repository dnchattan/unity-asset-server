import { EndianReader } from '../EndianReader';
import { readVector4, Vector4 } from './Vector';

export type Matrix4x4 = [Vector4, Vector4, Vector4, Vector4];

export function readMatrix4x4(reader: EndianReader): Matrix4x4 {
  return [readVector4(reader), readVector4(reader), readVector4(reader), readVector4(reader)];
}
