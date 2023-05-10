import { DataBuffer } from '@rs2/buffer';
import { DataFile } from './data-file';
import { IndexFile } from './index-file';
import { FileStoreFormat } from './file-store';
import logger from '../util/logger';

export const packedFileStoreFileName = 'main_file_cache';
export const jagDataFileName = packedFileStoreFileName + '.dat';
export const js5DataFileName = packedFileStoreFileName + '.dat2';

export type PackedFileStore = { [fileName: string]: Buffer | DataBuffer };

export const readPackedFileStore = (
    packedFileStore: PackedFileStore,
): {
    dataFile: DataFile;
    indexFiles: IndexFile[];
} => {
    const fileNames = Object.keys(packedFileStore);

    if (!fileNames.length) {
        throw new Error('No file provided.');
    }

    let format: FileStoreFormat;

    if (fileNames.includes(js5DataFileName)) {
        format = 'js5';
    } else if (fileNames.includes(jagDataFileName)) {
        format = 'jag';
    } else {
        throw new Error('Main cache data file not found.');
    }

    const fileEntries = Object.entries(packedFileStore);
    const indexFiles: IndexFile[] = [];
    const dataFile: DataFile = {
        cacheFormat: format
    };

    for (const [fileName, fileData] of fileEntries) {
        // File name must begin with `main_file_cache`
        if (!fileName?.length || !fileName.startsWith(packedFileStoreFileName)) {
            continue;
        }

        if (!fileData?.length) {
            logger.warn(`File ${fileName} is empty.`);
            continue;
        }

        if (fileName === js5DataFileName || fileName === jagDataFileName) {
            dataFile.data = DataBuffer.from(fileData);
        } else {
            const indexString = fileName.substring(fileName.indexOf('.idx') + 4);
            const indexNumber = Number(indexString);

            if (isNaN(indexNumber)) {
                logger.error(`Invalid index file ${fileName}.`);
            }

            indexFiles.push({
                indexNumber,
                data: DataBuffer.from(fileData),
            });
        }
    }

    return {dataFile, indexFiles};
};