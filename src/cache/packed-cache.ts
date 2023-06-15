import { DataBuffer } from '@rs2/buffer';
import { DataFile } from './data-file';
import { IndexFile } from './index-file';
import { CacheFormat } from './cache';
import logger from '../util/logger';

export const packedCacheFileName = 'main_file_cache';
export const jagDataFileName = packedCacheFileName + '.dat';
export const js5DataFileName = packedCacheFileName + '.dat2';

export type PackedCache = { [fileName: string]: Buffer | DataBuffer };

export const readPackedCache = (
    packedCache: PackedCache,
): {
    dataFile: DataFile;
    indexFiles: IndexFile[];
} => {
    const fileNames = Object.keys(packedCache);

    if (!fileNames.length) {
        throw new Error('No file provided.');
    }

    let format: CacheFormat;

    if (fileNames.includes(js5DataFileName)) {
        format = 'js5';
    } else if (fileNames.includes(jagDataFileName)) {
        format = 'jag';
    } else {
        throw new Error('Main cache data file not found.');
    }

    const fileEntries = Object.entries(packedCache);
    const indexFiles: IndexFile[] = [];
    const dataFile: DataFile = {
        cacheFormat: format
    };

    for (const [fileName, fileData] of fileEntries) {
        // File name must begin with `main_file_cache`
        if (!fileName?.length || !fileName.startsWith(packedCacheFileName)) {
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