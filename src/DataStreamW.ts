import { TypeEnum } from "./Reader";

export default class DataStreamW {
  public getPosition(): number {
    return this._position;
  }

  public writeUint8(value: number): void {
    this.allocForward(1);
    this._view.setUint8(this._position, value);
    this._position += 1;
  }

  public writeUCS2String(text: string): void {
    // https://stackoverflow.com/a/24386744
    var byteArray = new Uint8Array(text.length * 2);
    for (var i = 0; i < text.length; i++) {
      byteArray[i * 2] = text.charCodeAt(i) & 0xff;
      byteArray[i * 2 + 1] = (text.charCodeAt(i) >> 8) & 0xff;
    }
    this.writeUint8Array(byteArray);
  }

  public writeUint8Array(array: ArrayLike<number>): void {
    this.allocForward(array.length);
    for (let i = 0; i < array.length; i++) {
      this._view.setUint8(this._position++, array[i]);
    }
  }

  public writeInt32Array(array: number[]): void {
    for (let i = 0; i < array.length; i++) {
      this.writeInt32(array[i]);
    }
  }

  public writeUint16(value: number): void {
    this.allocForward(2);
    this._view.setUint16(this._position, value, true);
    this._position += 2;
  }

  public writeInt32(value: number): void {
    this.allocForward(4);
    this._view.setInt32(this._position, value, true);
    this._position += 4;
  }

  private allocForward(length: number) {
    const end = this._position + length;
    if (this._view.byteLength < end) {
      const newBuffer = new ArrayBuffer(end);
      new Uint8Array(newBuffer).set(new Uint8Array(this._view.buffer));
      this._view = new DataView(newBuffer);
    }
  }

  public seekBegin(position: number): void {
    this._position = position;
  }

  constructor(buffer: ArrayBuffer) {
    this._view = new DataView(buffer);
    this._position = 0;
  }

  private _view: DataView;
  private _position: number;
};
