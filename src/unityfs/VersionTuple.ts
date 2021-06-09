import { Brand, make } from 'ts-brand';
export type VersionTuple = [number, number, number, number];

export type Version = Brand<bigint, 'Version' & VersionTuple>;

const _makeVersion = make<Version>();

export function makeVersion(...tuple: Partial<VersionTuple>): Version {
  const version =
    (BigInt(tuple[0] ?? 0) << BigInt(32)) |
    (BigInt(tuple[1] ?? 0) << BigInt(16)) |
    (BigInt(tuple[2] ?? 0) << BigInt(8)) |
    BigInt(tuple[3] ?? 0);
  return _makeVersion(version);
}

export function unmakeVersion(version: Version): VersionTuple {
  // can't do bitmasks on bigint, so encode to hex and split it that way
  const versionHex = version.toString(16).padStart(16, '0');
  return [
    parseInt(versionHex.substr(0, 8), 16),
    parseInt(versionHex.substr(10, 2), 16),
    parseInt(versionHex.substr(12, 2), 16),
    parseInt(versionHex.substr(14, 2), 16),
  ];
}
