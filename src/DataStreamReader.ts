import { decodeAsLatin1, decodeAsUtf16le } from "./utils.js";

/**
 * @internal
 */
export class DataStreamReader {
  private _view: DataView;
  private _position: number;
  private _length: number;

  private getPositionAndAdvance(length: number): number {
    const position = this._position;
    this._position += length;
    return position;
  }

  constructor(buffer: Uint8Array, position: number = 0) {
    this._position = 0;
    this._length = buffer.byteLength - position;
    this._view = new DataView(
      buffer.buffer,
      buffer.byteOffset + position,
      this._length
    );
  }

  public getLength(): number {
    return this._length;
  }

  public readString(length?: number, decode?: (data: Uint8Array) => string): string {
    if (length === undefined) {
      length = this._length - this._position;
    }
    const data = this.subarray(this._position, this._position += length);
    if (decode) {
      return decode(data);
    } else {
      return decodeAsLatin1(data);
    }
  }

  public readUCS2String(count: number): string {
    const data = this.subarray(this._position, this._position += count * 2);
    return decodeAsUtf16le(data);
  }

  public seekCur(offset: number): void {
    this._position += offset;
  }

  public isEof(): boolean {
    return this._length <= this._position;
  }

  public readUint8(): number {
    return this._view.getUint8(this.getPositionAndAdvance(1));
  }

  public readUint16(): number {
    return this._view.getUint16(this.getPositionAndAdvance(2), true);
  }

  public readUint32(): number {
    return this._view.getUint32(this.getPositionAndAdvance(4), true);
  }

  public readInt32(): number {
    return this._view.getInt32(this.getPositionAndAdvance(4), true);
  }

  public getPosition(): number {
    return this._position;
  }

  private subarray(begin: number, end: number): Uint8Array<ArrayBufferLike> {
    const byteOffset = this._view.byteOffset;
    return new Uint8Array(this._view.buffer, byteOffset + begin, end - begin);
  }

  public seekBegin(position: number): void {
    this._position = position;
  }

  public seekBeginAndReadByte(offset: number): number {
    this.seekBegin(offset);
    return this.readUint8();
  }

  public seekBeginAndReadShort(offset: number): number {
    this.seekBegin(offset);
    return this.readUint16();
  }

  public seekBeginAndReadInt(offset: number): number {
    this.seekBegin(offset);
    return this.readInt32();
  }

  public seekBeginAndReadString(offset: number, length: number) {
    this.seekBegin(offset);
    return this.readUCS2String(length);
  }

  public readToUint8Array(length: number, arr: Uint8Array, dstOffset: number): void {
    const data = this.subarray(this._position, this._position += length);
    arr.set(data, dstOffset);
  }

  public readUint8Array(count: number): Uint8Array {
    const data = this.subarray(this._position, this._position += count);
    return data;
  }

  public readInt8Array(count: number): Int8Array {
    const byteOffset = this._view.byteOffset + this.getPositionAndAdvance(count);
    return new Int8Array(this._view.buffer, byteOffset, count);
  }

  public readUint16Array(count: number): Uint16Array {
    const byteOffset = this._view.byteOffset + this.getPositionAndAdvance(count * 2);
    return new Uint16Array(this._view.buffer, byteOffset, count);
  }

  public readInt16Array(count: number): Int16Array {
    const byteOffset = this._view.byteOffset + this.getPositionAndAdvance(count * 2);
    return new Int16Array(this._view.buffer, byteOffset, count);
  }

  public readUint32Array(count: number): Uint32Array {
    const byteOffset = this._view.byteOffset + this.getPositionAndAdvance(count * 4);
    return new Uint32Array(this._view.buffer, byteOffset, count);
  }

  public readInt32Array(count: number): Int32Array {
    const byteOffset = this._view.byteOffset + this.getPositionAndAdvance(count * 4);
    return new Int32Array(this._view.buffer, byteOffset, count);
  }

  public readUint32Items(count: number): ArrayLike<number> {
    const result = new Array(count);
    for (let i = 0; i < count; i++) {
      result[i] = this.readUint32();
    }
    return result;
  }
};
