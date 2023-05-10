import { DataBuffer } from '@rs2/buffer';
import { FileStoreFormat } from './file-store';
import { getIndexEntry, IndexFile } from './index-file';


export interface DataFile {
    cacheFormat: FileStoreFormat;
    data?: DataBuffer;
}

export const getFileData = (
    dataFile: DataFile,
    indexFile: IndexFile,
    fileNumber: number,
): DataBuffer => {
    if (!dataFile.data?.length) {
        throw new Error('Main data file is not loaded.');
    }

    const indexNumber = indexFile.indexNumber;
    const indexEntry = getIndexEntry(indexFile, fileNumber);
    const { fileSize, sectorPos } = indexEntry;
    const fileData = DataBuffer.alloc(fileSize);
    const sectorDataLength = 512;
    const sectorLength = 520;
    let remainingData = fileSize;
    let currentSectorNumber = sectorPos;
    let cycles = 0;

    dataFile.data.pos = 0;

    while (remainingData > 0) {
        let readableSectorData = sectorLength;
        let remaining = dataFile.data.remaining - currentSectorNumber * sectorLength;

        if (remaining < sectorLength) {
            readableSectorData = remaining;
        }

        const block = dataFile.data.getSlice(currentSectorNumber * sectorLength, readableSectorData);

        if (block.remaining < 8) {
            throw new Error(`File ${indexNumber}:${fileNumber} error: Not enough readable data.`);
        }

        const sectorFileNumber = block.readUShortBE();
        const sectorFilePartNumber = block.readUShortBE();
        const sectorNumber = block.readUMediumBE();
        const sectorIndexNumber = block.readUByte();

        readableSectorData -= 8;

        let bytesThisCycle = remainingData;

        if (bytesThisCycle > sectorDataLength) {
            bytesThisCycle = sectorDataLength;
        }

        block.copy(fileData, fileData.pos,
            block.pos, block.pos + readableSectorData);

        fileData.pos = fileData.pos + bytesThisCycle;
        remainingData -= bytesThisCycle;

        if (cycles !== sectorFilePartNumber) {
            throw new Error(`File ${indexFile.indexNumber}:${fileNumber} error: File data is corrupted.`);
        }

        if (remainingData > 0) {
            if (sectorIndexNumber !== (dataFile.cacheFormat === 'jag' ? (indexNumber + 1) : indexNumber)) {
                throw new Error(`File ${indexNumber}:${fileNumber} error: Cache number mismatch, expected cache ${indexNumber} but found ${sectorIndexNumber}`);
            }

            if (sectorFileNumber !== fileNumber) {
                throw new Error(`File ${indexNumber}:${fileNumber} error: File number mismatch, expected ${fileNumber} but found ${sectorFileNumber}.`);
            }
        }

        currentSectorNumber = sectorNumber;
        cycles++;
    }

    return fileData;
};

export const decodeDataFile = (): void => {
    // @todo stubbed
};

export const encodeDataFile = (): void => {
    // @todo stubbed
};
