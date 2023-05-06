import { DataBuffer } from '@rs2/buffer';
import Bzip2 from './bzip2/bzip2';


export class HeadlessBzip2 {

    static decompress(data: Buffer | DataBuffer): DataBuffer {
        const buffer = Buffer.alloc(data.length + 4);
        data.copy(buffer, 4);
        buffer[0] = 'B'.charCodeAt(0);
        buffer[1] = 'Z'.charCodeAt(0);
        buffer[2] = 'h'.charCodeAt(0);
        buffer[3] = '1'.charCodeAt(0);

        return DataBuffer.from(Bzip2.decompressFile(buffer));
    }

    static compress(data: Buffer | DataBuffer): DataBuffer {
        return DataBuffer.from(
            Buffer.from(
                Bzip2.compressFile(data, undefined, 1)
            ).subarray(4, data.length)
        );
    }

}
