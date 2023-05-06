import { DataBuffer } from '@rs2/buffer';


export type XteaKeys = [number, number, number, number];

const validKeys = (keys: XteaKeys): boolean => {
    if (keys.length !== 4) {
        return false;
    }

    return !(keys[0] === 0 && keys[1] === 0 && keys[2] === 0 && keys[3] === 0);
};

const int = value => value | 0;

export const xteaDecrypt = (
    data: Buffer | DataBuffer,
    keys: XteaKeys,
): DataBuffer => {
    const input = DataBuffer.from(data);

    if (!validKeys(keys)) {
        return input;
    }

    const output = DataBuffer.alloc(data.length);
    const blockCount = Math.floor(data.length / 8);

    for (let i = 0; i < blockCount; i++) {
        let v0 = input.readIntBE();
        let v1 = input.readIntBE();
        let sum = 0x9E3779B9 * 32;

        for (let i = 0; i < 32; i++) {
            v1 -= ((int(v0 << 4) ^ int(v0 >>> 5)) + v0) ^ (sum + keys[(sum >>> 11) & 3]);
            v1 = int(v1);

            sum -= 0x9E3779B9;

            v0 -= ((int(v1 << 4) ^ int(v1 >>> 5)) + v1) ^ (sum + keys[sum & 3]);
            v0 = int(v0);
        }

        output.writeIntBE(v0);
        output.writeIntBE(v1);
    }

    return output;
}

export const xteaEncrypt = (
    data: Buffer | DataBuffer,
    keys: XteaKeys,
): DataBuffer => {
    const input = DataBuffer.from(data);

    if (!validKeys(keys)) {
        return input;
    }

    const output = DataBuffer.alloc(data.length);
    const blockCount = Math.floor(data.length / 8);

    for (let i = 0; i < blockCount; i++) {
        let v0 = input.readIntBE();
        let v1 = input.readIntBE();
        let sum = 0;
        const delta = -0x61c88647;

        let rounds = 32;
        while (rounds-- > 0) {
            v0 += ((sum + keys[sum & 3]) ^ (v1 + ((v1 >>> 5) ^ (v1 << 4))));
            sum += delta
            v1 += ((v0 + ((v0 >>> 5) ^ (v0 << 4))) ^ (keys[(sum >>> 11) & 3] + sum));
        }

        output.writeIntBE(v0);
        output.writeIntBE(v1);
    }

    return output;
};
