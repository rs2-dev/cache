import { DataBuffer } from '@rs2/buffer';
import { gunzipSync, gzipSync } from 'zlib';
import { xteaDecrypt, xteaEncrypt, XteaKeys } from '../../encryption/xtea';
import { HeadlessBzip2 } from '../../compression/headless-bzip2';


export enum Js5CompressionType {
    NONE = 0,
    BZIP2 = 1,
    GZIP = 2,
}

export enum Js5FileError {
    DECRYPT_FAILED = 'DECRYPT_FAILED',
    DECOMPRESS_FAILED = 'DECOMPRESS_FAILED',
    ENCRYPT_FAILED = 'ENCRYPT_FAILED',
    COMPRESS_FAILED = 'COMPRESS_FAILED',
}

export interface Js5File {
    compressionType: Js5CompressionType;
    fileData?: DataBuffer;
    decompressedDataLength?: number;
    compressedDataLength?: number;
    version?: number;
    packed?: boolean;
    errorCode?: Js5FileError;
    error?: any;
}

export const unpackJs5File = (
    data: Buffer | DataBuffer,
    decryptionKeys?: XteaKeys,
): Js5File => {
    const input = DataBuffer.from(data);
    input.pos = 0;

    // Read the packed file header
    const compressionType: Js5CompressionType = input.readUByte();
    const compressedDataLength = input.readUIntBE();
    let decompressedDataLength: number | undefined = undefined;
    const headerLength = 5; // 1 byte for compression, 4 bytes for compressed file size

    // Read the packed file footer (if available)
    // Full packed file length - (compressed file data length + file header length + 4 (for the
    // uncompressed file data length int which isn't included in compressed file data length)
    const hasFooter = input.length - (compressedDataLength + headerLength + 4) >= 2;
    let fileVersion: number | undefined = undefined;
    if (hasFooter) {
        // Read the file's version number (if available)
        input.pos = input.length - 2;
        fileVersion = input.readUShortBE();
    }

    let fileData = DataBuffer.from(input.subarray(headerLength, headerLength + compressedDataLength));

    if (compressionType === Js5CompressionType.NONE) {
        return {
            compressionType,
            fileData,
            decompressedDataLength: compressedDataLength,
            version: fileVersion,
            packed: false,
        };
    } else {
        try {
            if (decryptionKeys?.length === 4) {
                // Decrypt the file compressed data if decryption keys were provided
                fileData = xteaDecrypt(fileData, decryptionKeys);
            }
        } catch (error) {
            return {
                compressionType,
                fileData: input,
                compressedDataLength,
                version: fileVersion,
                packed: true,
                errorCode: Js5FileError.DECRYPT_FAILED,
                error,
            };
        }

        try {
            decompressedDataLength = fileData.readUIntBE();
            fileData = DataBuffer.from(fileData.subarray(4, fileData.length));
            fileData = DataBuffer.from(compressionType === Js5CompressionType.BZIP2 ?
                HeadlessBzip2.decompress(fileData) : gunzipSync(fileData));

            return {
                compressionType,
                fileData,
                decompressedDataLength,
                compressedDataLength,
                version: fileVersion,
                packed: false,
            };
        } catch (error) {
            return {
                compressionType,
                fileData: input,
                compressedDataLength,
                decompressedDataLength,
                version: fileVersion,
                packed: true,
                errorCode: Js5FileError.DECOMPRESS_FAILED,
                error,
            };
        }
    }
};

export const packJs5File = (
    data: Buffer | DataBuffer,
    compressionType: Js5CompressionType,
    fileVersion?: number,
    encryptionKeys?: XteaKeys,
): Js5File => {
    let input = DataBuffer.from(data);
    const decompressedDataLength = input.length;
    const hasFooter = fileVersion !== undefined && fileVersion !== null && fileVersion !== -1;

    // +5 bytes for the header
    // +2 bytes for the footer if a version number was provided
    // +4 bytes for the decompressed data length if the file is compressed
    const outputDataLength = decompressedDataLength + 5 + (hasFooter ? 2 : 0) + (compressionType !== Js5CompressionType.NONE ? 4 : 0);
    const output = DataBuffer.alloc(outputDataLength);
    output.writeByte(compressionType);

    let compressedDataLength: number | undefined = undefined;

    if (compressionType === Js5CompressionType.NONE) {
        // Uncompressed files - append the file data length followed by the file data itself
        output.writeIntBE(decompressedDataLength);
        output.writeBytes(input);
    } else {
        // Bzip2 or Gzip compressed files
        let fileData = input;

        try {
            if (encryptionKeys?.length === 4) {
                // Encrypt the file data if encryption keys were provided
                fileData = xteaEncrypt(input, encryptionKeys);
            }
        } catch (error) {
            return {
                compressionType,
                fileData: input,
                compressedDataLength,
                decompressedDataLength,
                version: fileVersion,
                packed: false,
                errorCode: Js5FileError.ENCRYPT_FAILED,
                error,
            };
        }

        try {
            const compressedFileData = DataBuffer.from(compressionType == Js5CompressionType.BZIP2 ?
                HeadlessBzip2.compress(fileData) : gzipSync(fileData));

            compressedDataLength = compressedFileData.length;

            output.writeIntBE(compressedDataLength);
            output.writeIntBE(decompressedDataLength);
            output.writeBytes(compressedFileData);
        } catch (error) {
            return {
                compressionType,
                fileData: input,
                compressedDataLength,
                decompressedDataLength,
                version: fileVersion,
                packed: false,
                errorCode: Js5FileError.COMPRESS_FAILED,
                error,
            };
        }
    }

    // Append the packed file footer if a version number was provided
    if (hasFooter) {
        output.writeShortBE(fileVersion);
    }

    return {
        compressionType,
        fileData: output,
        decompressedDataLength,
        compressedDataLength,
        version: fileVersion,
        packed: true,
    };
};
