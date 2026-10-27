import fs from 'fs';
import { expect } from 'chai';
import { Reader } from '../lib/Reader';

describe('ReaderAntiCyclic', function () {

  function testIt(file) {
    const array = fs.readFileSync(`test3/${file}`);
    const reader = new Reader(array);
    reader.parse();
  };

  it('cyclicDirTree.msg', function () {
    expect(testIt.bind(null, 'cyclicDirTree.msg')).to.throw("Cyclic property hierarchy detected");
  });
  it('cyclicFatRing.msg', function () {
    expect(testIt.bind(null, 'cyclicFatRing.msg')).to.throw("Cyclic property chain detected");
  });
});
