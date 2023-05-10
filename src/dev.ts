import { readFileSync, writeFileSync } from 'fs';
import Bzip2 from './compression/bzip2/bzip2';
import logger from './util/logger';

const testBzip2 = () => {
    const bz2Data = readFileSync('./data/unnamed.jpg.bz2');

    // const unzipped = HeadlessBzip2.decompress(bz2Data);
    const unzipped = Bzip2.decompressFile(bz2Data);

    logger.info(`zipped len: ${bz2Data.length}, unzipped len: ${unzipped.length}`);

    // writeFileSync('./data/obj.dat', unzipped);
    writeFileSync('./data/unnamed.jpg', unzipped);

    // const rezipped = HeadlessBzip2.compress(unzipped);
    const rezipped = Bzip2.compressFile(unzipped, undefined, 1);

    logger.info(`rezipped len: ${rezipped.length}`);
};

(async function() {
    testBzip2();
}());
