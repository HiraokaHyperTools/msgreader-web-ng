import fs from 'fs';
import assert from 'assert';
import { Reader } from '../lib/Reader';

describe('Reader', function () {

  it('Small.bin', function () {
    testIt('Small.bin', "First Second Third");
  });
  it('Normal.bin', function () {
    testIt('Normal.bin', "First Second Third Fourth Fifth Sixth Seventh Eighth");
  });

  function testIt(file: string, expectedWords: string) {
    const array = fs.readFileSync(`test2/${file}`);
    const reader = new Reader(array);
    reader.parse();

    const readData = reader.rootFolder().readFile("File");
    assert.notStrictEqual(readData, null);
    assert.notStrictEqual(readData, undefined);

    if (!readData) {
      throw new Error("readData is null or undefined"); // never
    }

    const actual = Buffer.from(readData).toString("ascii").replace(/\0+/g, " ").trim();
    assert.strictEqual(actual, expectedWords);
  };
});
