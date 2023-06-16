import { DataBuffer } from '@rs2/buffer';


export interface Js5GroupedFile {
    fileNumber?: number;
    nameHash?: number;
}

export interface Js5Group {
    groupNumber: number;
    nameHash?: number;
    compressedChecksum?: number;
    decompressedChecksum?: number;
    whirlpoolDigest?: Buffer;
    compressedLength?: number;
    decompressedLength?: number;
    version?: number;
    fileCount?: number;
    files?: Js5GroupedFile[];
}

export const decodeJs5Group = (
    groupNumber: number,
    data: Buffer | DataBuffer,
): void => {
    const input = DataBuffer.from(data);
    input.pos = 0;
    // @todo stubbed
};

export const encodeJs5Group = (group: Js5Group): DataBuffer | null => {
    // @todo stubbed
    return null;
};
