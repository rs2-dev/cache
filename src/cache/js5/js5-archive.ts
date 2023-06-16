import { DataBuffer } from '@rs2/buffer';
import { Js5Group } from './js5-group';


export enum Js5ArchiveFormat {
    original = 5,
    versioned = 6,
}

export interface Js5Archive {
    archiveNumber: number;
    format: Js5ArchiveFormat;
    settings: Js5ArchiveSettings;
    version?: number;
    groupCount: number;
    groups: Js5Group[];
}

const GROUPS_NAMED_FLAG = 0x01;
const WHIRLPOOL_DIGESTS_FLAG = 0x02;
const GROUP_LENGTHS_FLAG = 0x04;
const DECOMPRESSED_CHECKSUMS_FLAG = 0x08;

export interface Js5ArchiveSettings {
    groupsNamed?: boolean;
    whirlpoolDigests?: boolean;
    groupLengths?: boolean;
    decompressedChecksums?: boolean;
}

export const decodeJs5ArchiveSettings = (archiveSettings: number): Js5ArchiveSettings => ({
    groupsNamed: (archiveSettings & GROUPS_NAMED_FLAG) !== 0,
    whirlpoolDigests: (archiveSettings & WHIRLPOOL_DIGESTS_FLAG) !== 0,
    groupLengths: (archiveSettings & GROUP_LENGTHS_FLAG) !== 0,
    decompressedChecksums: (archiveSettings & DECOMPRESSED_CHECKSUMS_FLAG) !== 0,
});

export const encodeJs5ArchiveSettings = (archiveSettings: Js5ArchiveSettings): number => {
    let output = 0;

    if (archiveSettings.groupsNamed) {
        output |= GROUPS_NAMED_FLAG;
    }
    if (archiveSettings.whirlpoolDigests) {
        output |= WHIRLPOOL_DIGESTS_FLAG;
    }
    if (archiveSettings.groupLengths) {
        output |= GROUP_LENGTHS_FLAG;
    }
    if (archiveSettings.decompressedChecksums) {
        output |= DECOMPRESSED_CHECKSUMS_FLAG;
    }

    return output;
};

// @todo currently in a very human-readable format, refactor and clean this up - 15/Jun/23 - Kiko
const calculateEncodedLength = (archive: Js5Archive): number => {
    const {
        format,
        settings: {
            groupsNamed,
            whirlpoolDigests,
            groupLengths,
            decompressedChecksums,
        },
        groupCount,
        groups,
    } = archive;

    let encodedLength = 1; // archive format
    if (format >= Js5ArchiveFormat.versioned) {
        encodedLength += 4; // archive version
    }
    encodedLength += 1; // archive settings
    encodedLength += 2; // group count
    encodedLength += (groupCount * 2); // group number deltas
    if (groupsNamed) {
        encodedLength += (groupCount * 4); // group name hashes
    }
    encodedLength += (groupCount * 4); // group compressed file data checksums
    if (decompressedChecksums) {
        encodedLength += (groupCount * 4); // group decompressed file data checksums
    }
    if (whirlpoolDigests) {
        encodedLength += (groupCount * 512); // group file data whirlpool digests
    }
    if (groupLengths) {
        encodedLength += (groupCount * 4); // group compressed file data lengths
        encodedLength += (groupCount * 4); // group decompressed file data lengths
    }
    encodedLength += (groupCount * 2); // group child file counts
    for (const group of groups) {
        encodedLength += (group.fileCount * 2); // group child file number deltas
    }
    if (groupsNamed) {
        for (const group of groups) {
            encodedLength += (group.fileCount * 4); // group child file name hashes
        }
    }

    return encodedLength;
};

export const decodeJs5Archive = (
    archiveNumber: number,
    data: Buffer | DataBuffer,
): Js5Archive | null => {
    const input = DataBuffer.from(data);
    input.pos = 0;

    const archiveFormat: Js5ArchiveFormat = input.readUByte();
    const version: number | undefined =
        archiveFormat >= Js5ArchiveFormat.versioned ? input.readIntBE() : undefined;
    const archiveSettings = decodeJs5ArchiveSettings(input.readUByte());
    const groupCount = input.readUShortBE();
    const groups: Js5Group[] = new Array(groupCount);

    let accumulator: number = 0;
    let i: number, j: number;

    // Group numbers (ids)
    for (i = 0; i < groupCount; i++) {
        const delta = input.readUShortBE();
        const groupNumber = accumulator += delta;
        groups[i] = { groupNumber };
    }
    
    // Group name hashes
    if (archiveSettings.groupsNamed) {
        for (i = 0; i < groupCount; i++) {
            groups[i].nameHash = input.readIntBE();
        }
    }

    // Compressed file data checksums
    for (i = 0; i < groupCount; i++) {
        groups[i].compressedChecksum = input.readIntBE();
    }

    // Decompressed file data checksums
    if (archiveSettings.decompressedChecksums) {
        for (i = 0; i < groupCount; i++) {
            groups[i].decompressedChecksum = input.readIntBE();
        }
    }

    // File data whirlpool digests
    if (archiveSettings.whirlpoolDigests) {
        for (i = 0; i < groupCount; i++) {
            const whirlpoolDigest = Buffer.alloc(512);
            input.readBytes(whirlpoolDigest, 512);
            groups[i].whirlpoolDigest = whirlpoolDigest;
        }
    }

    // Encoded group data lengths
    if (archiveSettings.groupLengths) {
        for (i = 0; i < groupCount; i++) {
            groups[i].compressedLength = input.readIntBE();
            groups[i].decompressedLength = input.readIntBE();
        }
    }

    // Group version numbers
    for (i = 0; i < groupCount; i++) {
        groups[i].version = input.readIntBE();
    }

    // Group child file counts
    for (let i = 0; i < groupCount; i++) {
        groups[i].fileCount = input.readUShortBE();
        groups[i].files = new Array(groups[i].fileCount);
    }

    // Group child file numbers (ids)
    for (let i = 0; i < groupCount; i++) {
        const fileCount = groups[i].fileCount ?? 0;
        accumulator = 0;

        for (j = 0; j < fileCount; j++) {
            const delta = input.readUShortBE();
            const fileNumber = accumulator += delta;
            groups[i].files[j] = { fileNumber };
        }
    }

    // Group child file names
    if (archiveSettings.groupsNamed) {
        for (let i = 0; i < groupCount; i++) {
            for (j = 0; j < groups[i].fileCount; j++) {
                groups[i].files[j].nameHash = input.readIntBE();
            }
        }
    }

    return {
        archiveNumber,
        format: archiveFormat,
        settings: archiveSettings,
        version,
        groupCount,
        groups,
    };
};

export const encodeJs5Archive = (archive: Js5Archive): DataBuffer => {
    const {
        format: archiveFormat,
        settings: archiveSettings,
        version,
        groupCount,
        groups,
    } = archive;

    const encodedLength = calculateEncodedLength(archive);
    const output = DataBuffer.alloc(encodedLength);

    let lastFileNumber = 0;

    output.writeByte(archiveFormat);

    if (archiveFormat >= Js5ArchiveFormat.versioned) {
        output.writeIntBE(version);
    }

    output.writeByte(encodeJs5ArchiveSettings(archiveSettings));
    output.writeShortBE(groupCount);

    // Group numbers (ids)
    for (const { groupNumber } of groups) {
        output.writeShortBE(groupNumber - lastFileNumber);
        lastFileNumber = groupNumber;
    }

    // Group name hashes
    if (archiveSettings.groupsNamed) {
        for (const { nameHash } of groups) {
            output.writeIntBE(nameHash);
        }
    }

    // Compressed file data checksums
    for (const { compressedChecksum } of groups) {
        output.writeIntBE(compressedChecksum);
    }

    // Decompressed file data checksums
    if (archiveSettings.decompressedChecksums) {
        for (const { decompressedChecksum } of groups) {
            output.writeIntBE(decompressedChecksum);
        }
    }

    // File data whirlpool digests
    if (archiveSettings.whirlpoolDigests) {
        for (const { whirlpoolDigest } of groups) {
            output.writeBytes(whirlpoolDigest);
        }
    }

    // Encoded group data lengths
    if (archiveSettings.groupLengths) {
        for (const { compressedLength, decompressedLength } of groups) {
            output.writeIntBE(compressedLength);
            output.writeIntBE(decompressedLength);
        }
    }

    // Group version numbers
    for (const { version } of groups) {
        output.writeIntBE(version);
    }

    // Group child file counts
    for (const { fileCount } of groups) {
        output.writeShortBE(fileCount);
    }

    // Group child file numbers (ids)
    for (const { files } of groups) {
        lastFileNumber = 0;
        for (const { fileNumber } of files) {
            output.writeShortBE(fileNumber - lastFileNumber);
            lastFileNumber = fileNumber;
        }
    }

    // Group child file names
    if (archiveSettings.groupsNamed) {
        for (const { files } of groups) {
            for (const { nameHash } of files) {
                output.writeIntBE(nameHash);
            }
        }
    }

    return output;
};
