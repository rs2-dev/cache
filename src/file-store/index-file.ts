import { DataBuffer } from '@rs2/buffer';


export interface IndexEntry {
    fileNumber: number;
    fileSize: number;
    sectorPos: number;
}

export interface IndexFile {
    indexNumber: number;
    data?: DataBuffer;
}

export const getIndexEntry = (
    indexFile: IndexFile,
    fileNumber: number,
): IndexEntry => {
    if (!indexFile.data?.length) {
        throw new Error(`Index ${indexFile.indexNumber} data is not loaded.`);
    }

    const indexFilePointer = fileNumber * 6;

    if (indexFilePointer < 0 || indexFilePointer >= indexFile.data.length) {
        throw new Error(`Index file pointer out of bounds: ${indexFilePointer}, index file length ${indexFile.data.length}.`);
    }

    indexFile.data.pos = indexFilePointer;

    const fileSize = indexFile.data.readUMediumBE();
    const sectorPos = indexFile.data.readUMediumBE();

    return { fileNumber, fileSize, sectorPos };
};

export const decodeIndexFile = (indexFile: IndexFile): IndexEntry[] => {
    if (!indexFile.data?.length) {
        throw new Error(`Index ${indexFile.indexNumber} data is not loaded.`);
    }

    indexFile.data.pos = 0;

    const fileEntries: IndexEntry[] = new Array(indexFile.data.length / 6);

    for (let fileNumber = 0; fileNumber < fileEntries.length; fileNumber++) {
        const fileSize = indexFile.data.readUMediumBE();
        const sectorPos = indexFile.data.readUMediumBE();
        fileEntries[fileNumber] = { fileNumber, fileSize, sectorPos };
    }

    return fileEntries;
};

export const encodeIndexFile = (
    indexNumber: number,
    fileEntries: IndexEntry[],
): IndexFile => {
    if (fileEntries.length === 0) {
        throw new Error(`No files provided to encode index ${indexNumber}.`);
    }

    const data = DataBuffer.alloc(fileEntries.length * 6);

    fileEntries.sort((a, b) => a.fileNumber - b.fileNumber);

    for (const file of fileEntries) {
        data.writeMediumBE(file.fileSize);
        data.writeMediumBE(file.sectorPos);
    }

    return { indexNumber, data };
};
