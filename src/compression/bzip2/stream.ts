/**
 * Ported from cscott's compressjs library
 * @see https://github.com/cscott
 * @see https://github.com/cscott/compressjs
 */

const EOF = -1;

const Stream = function() {
    /* ABSTRACT */
};
// you must define one of read / readByte for a readable stream
Stream.prototype.readByte = function() {
    const buf = [ 0 ];
    const len = this.read(buf, 0, 1);
    if (len===0) { this._eof = true; return EOF; }
    return buf[0];
};
Stream.prototype.read = function(buf, bufOffset, length) {
    let ch, bytesRead = 0;
    while (bytesRead < length) {
        ch = this.readByte();
        if (ch === EOF) { this._eof = true; break; }
        buf[bufOffset+(bytesRead++)] = ch;
    }
    return bytesRead;
};
// reasonable default implementation of 'eof'
Stream.prototype.eof = function() { return !!this._eof; };
// not all readable streams are seekable
Stream.prototype.seek = function(pos) {
    throw new Error('Stream is not seekable.');
};
Stream.prototype.tell = function() {
    throw new Error('Stream is not seekable.');
};
// you must define one of write / writeByte for a writable stream
Stream.prototype.writeByte = function(_byte) {
    const buf = [ _byte ];
    this.write(buf, 0, 1);
};
Stream.prototype.write = function(buf, bufOffset, length) {
    let i;
    for (i=0; i<length; i++) {
        this.writeByte(buf[bufOffset + i]);
    }
    return length;
};
// flush will happily do nothing if you don't override it.
Stream.prototype.flush = function() { };

// export EOF as a constant.
Stream.EOF = EOF;

export default Stream;
