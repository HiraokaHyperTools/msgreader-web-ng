import fs from 'node:fs';
import { track } from 'temp';
import { execFile } from 'child_process';
import { join } from 'path';
import { decompressRTF } from '@kenjiuno/decompressrtf';
import assert from 'assert';
import { CFolder, TypeEnum } from '../lib/Reader';
import { MsgReader, burn, Reader } from '../lib/index';
import { toHexStr } from '../lib/utils';
import { DataStreamReader } from '../lib/DataStreamReader';
import { msftUuidStringify } from '../lib/utils';
import { toHex1, toHex2, toHex4 } from '../lib/utils';
import type { AttachmentData, FieldsData } from '../lib/index';

const temp = track();

const generateJsonData = false;
const useValidateCompoundFile = process.platform === 'win32';

describe('MsgReader', function () {
  describe('test1.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)', function () {
      run(
        ({ testMsgInfo }) => {
          const msg = removeCompressedRtf(testMsgInfo);
          use(msg, 'test/test1.json');
        }
      );
    });
    it('compare rtf', function () {
      run(
        ({ testMsgInfo }) => {
          useRtf(testMsgInfo, 'test/test1.rtf');
        }
      );
    });

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/test1.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = testMsg.getFileData();
      callback({ testMsgInfo });
    }
  });

  describe('test2.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)', function () {
      run(
        ({ testMsgInfo }) => {
          const msg = removeCompressedRtf(testMsgInfo);
          use(msg, 'test/test2.json');
        }
      )
    });

    it('verify attachment: A.txt', function () {
      run(
        ({ testMsgAttachment0 }) => {
          assert.deepStrictEqual(
            testMsgAttachment0,
            {
              fileName: 'A.txt',
              content: new Uint8Array([97, 116, 116, 97, 99, 104, 32, 116, 101, 115, 116])
            }
          );
        }
      );
    });

    it('compare rtf', function () {
      run(
        ({ testMsgInfo }) => {
          useRtf(testMsgInfo, 'test/test2.rtf');
        }
      )
    });

    function run(callback: (arg: { testMsgInfo: FieldsData, testMsgAttachment0: AttachmentData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/test2.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = testMsg.getFileData();
      const testMsgAttachment0 = testMsg.getAttachment(0);
      callback({ testMsgInfo, testMsgAttachment0 });
    }
  });

  describe('msgInMsg.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => runAsync(
        async ({ testMsgInfo }) => {
          const msg = removeCompressedRtf(testMsgInfo);
          use(msg, 'test/msgInMsg.json');
        }
      )
    );

    it('testMsgAttachment0 === testMsgAttachments0',
      () => runAsync(
        async ({ testMsgAttachment0, testMsgAttachments0 }) => {
          assert.deepStrictEqual(testMsgAttachment0, testMsgAttachments0);
        }
      )
    );

    (useValidateCompoundFile ? it : it.skip)('validateCompoundFile: inner testMsgAttachments0',
      () => runAsync(
        async ({ testMsgAttachments0 }) => {
          await runValidateCompoundFileAsync({ binary: testMsgAttachments0.content });
        }
      )
    );

    it('re-parse and verify rebuilt inner testMsgAttachments0',
      () => runAsync(
        async ({ testMsgAttachments0 }) => {
          const subReader = new MsgReader(testMsgAttachments0.content);
          const subInfo = subReader.getFileData();
          const subMsg = removeCompressedRtf(subInfo);
          use(subMsg, 'test/msgInMsg-attachments0.json');
        }
      )
    );

    it('compare rtf',
      () => runAsync(
        async ({ testMsgInfo }) => {
          useRtf(testMsgInfo, 'test/msgInMsg.rtf');
        }
      )
    );

    async function runAsync(callback: (arg: { testMsgInfo: FieldsData, testMsgAttachment0: AttachmentData, testMsgAttachments0: AttachmentData }) => Promise<void>) {
      const msgFileBuffer = fs.readFileSync('test/msgInMsg.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      const testMsgAttachment0 = testMsg.getAttachment(0);
      const testMsgAttachments0 = testMsg.getAttachment(ensureNotNullish(testMsgInfo.attachments)[0]);
      await callback({ testMsgInfo, testMsgAttachment0, testMsgAttachments0 });
    }
  });


  describe('msgInMsgInMsg.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => runAsync(
        async ({ testMsgInfo }) => {
          const msg = removeCompressedRtf(testMsgInfo);
          use(msg, 'test/msgInMsgInMsg.json');
        }
      )
    );

    (useValidateCompoundFile ? it : it.skip)('validateCompoundFile: inner testMsgAttachments0',
      () => runAsync(
        async ({ testMsgAttachments0 }) => {
          await runValidateCompoundFileAsync({ binary: testMsgAttachments0.content });
        }
      )
    );

    it('re-parse and verify rebuilt inner testMsgAttachments0',
      () => runAsync(
        async ({ testMsgAttachments0 }) => {
          const subReader = new MsgReader(testMsgAttachments0.content);
          const subInfo = subReader.getFileData();
          const subMsg = removeCompressedRtf(subInfo);

          use(subMsg, 'test/msgInMsgInMsg-attachments0.json');
        }
      )
    );


    (useValidateCompoundFile ? it : it.skip)('validateCompoundFile: inner testMsgAttachments0AndItsAttachments0',
      () => runAsync(
        async ({ testMsgAttachments0AndItsAttachments0 }) => {
          await runValidateCompoundFileAsync({ binary: testMsgAttachments0AndItsAttachments0.content });
        }
      )
    );

    it('re-parse and verify rebuilt inner testMsgAttachments0AndItsAttachments0',
      () => runAsync(
        async ({ testMsgAttachments0AndItsAttachments0 }) => {
          const subReader = new MsgReader(testMsgAttachments0AndItsAttachments0.content);
          const subInfo = subReader.getFileData();
          const subMsg = removeCompressedRtf(subInfo);

          use(subMsg, 'test/msgInMsgInMsg-attachments0-attachments0.json');
        }
      )
    );

    it('compare rtf',
      () => runAsync(
        async ({ testMsgInfo }) => {
          useRtf(testMsgInfo, 'test/msgInMsgInMsg.rtf');
        }
      )
    );

    async function runAsync(callback: (arg: { testMsgInfo: FieldsData, testMsgAttachments0: AttachmentData, testMsgAttachments0AndItsAttachments0: AttachmentData }) => Promise<void>) {
      const msgFileBuffer = fs.readFileSync('test/msgInMsgInMsg.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      const testMsgAttachments0 = testMsg.getAttachment(
        ensureNotNullish(testMsgInfo.attachments)[0]
      );
      const testMsgAttachments0AndItsAttachments0 = testMsg.getAttachment(
        ensureNotNullish(ensureNotNullish(ensureNotNullish(testMsgInfo.attachments)[0].innerMsgContentFields).attachments)[0]
      );
      await callback({ testMsgInfo, testMsgAttachments0, testMsgAttachments0AndItsAttachments0 });
    }
  });

  describe('Subject.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/Subject.json');
      })
    );

    it('compare rtf',
      () => run(({ testMsgInfo }) => {
        useRtf(testMsgInfo, 'test/Subject.rtf');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/Subject.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  describe('sent.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/sent.json');
      })
    );

    it('compare rtf',
      () => run(({ testMsgInfo }) => {
        useRtf(testMsgInfo, 'test/sent.rtf');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/sent.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  describe('sent2.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/sent2.json');
      })
    );

    it('compare rtf',
      () => run(({ testMsgInfo }) => {
        useRtf(testMsgInfo, 'test/sent2.rtf');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/sent2.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  describe('longerFat.msg', function () {
    it('re-parse and verify rebuilt inner testMsgAttachments0',
      () => run(({ testMsgAttachments0 }) => {
        const subReader = new MsgReader(testMsgAttachments0.content);
        const subInfo = subReader.getFileData();
        const subMsg = removeCompressedRtf(subInfo);

        use(subMsg, 'test/longerFat-attachments0.json');
      })
    );

    function run(callback: (arg: { testMsgAttachments0: AttachmentData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/longerFat.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      const testMsgAttachments0 = ensureNotNullish(testMsg.getAttachment(ensureNotNullish(testMsgInfo.attachments)[0]));
      callback({ testMsgAttachments0 });
    }
  });

  describe('longerDifat.msg', function () {
    it('re-parse and verify rebuilt inner testMsgAttachments0',
      () => run(({ testMsgAttachments0 }) => {
        const subReader = new MsgReader(testMsgAttachments0.content);
        const subInfo = subReader.getFileData();
        const subMsg = removeCompressedRtf(subInfo);

        use(subMsg, 'test/longerDifat-attachments0.json');
      })
    );

    function run(callback: (arg: { testMsgAttachments0: AttachmentData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/longerDifat.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      const testMsgAttachments0 = ensureNotNullish(testMsg.getAttachment(ensureNotNullish(testMsgInfo.attachments)[0]));
      callback({ testMsgAttachments0 });
    }
  });

  describe('attachAndInline.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/attachAndInline.json');
      })
    );

    it('compare rtf',
      () => run(({ testMsgInfo }) => {
        useRtf(testMsgInfo, 'test/attachAndInline.rtf');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/attachAndInline.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  describe('voteItems.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/voteItems.json');
      })
    );

    it('compare rtf',
      () => run(({ testMsgInfo }) => {
        useRtf(testMsgInfo, 'test/voteItems.rtf');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/voteItems.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  describe('voteNo.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/voteNo.json');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/voteNo.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  describe('voteYes.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/voteYes.json');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/voteYes.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  describe('A schedule.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/A schedule.json');
      })
    );

    it('compare rtf',
      () => run(({ testMsgInfo }) => {
        useRtf(testMsgInfo, 'test/A schedule.rtf');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/A schedule.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  describe('A memo.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/A memo.json');
      })
    );

    it('compare rtf',
      () => run(({ testMsgInfo }) => {
        useRtf(testMsgInfo, 'test/A memo.rtf');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/A memo.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());

      callback({ testMsgInfo });
    }
  });

  describe('nonUnicodeMail.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/nonUnicodeMail.json');
      })
    );

    it('compare rtf',
      () => run(({ testMsgInfo }) => {
        useRtf(testMsgInfo, 'test/nonUnicodeMail.rtf');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/nonUnicodeMail.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  describe('nonUnicodeCP932.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/nonUnicodeCP932.json');
      })
    );

    it('compare rtf',
      () => run(({ testMsgInfo }) => {
        useRtf(testMsgInfo, 'test/nonUnicodeCP932.rtf');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/nonUnicodeCP932.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      testMsg.parserConfig = {
        ansiEncoding: '932',
      };
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  describe('contactAnsi.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/contactAnsi.json');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/contactAnsi.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  describe('contactUnicode.msg', function () {
    it('exact match with pre rendered data (except on compressedRtf)',
      () => run(({ testMsgInfo }) => {
        const msg = removeCompressedRtf(testMsgInfo);
        use(msg, 'test/contactUnicode.json');
      })
    );

    function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
      const msgFileBuffer = fs.readFileSync('test/contactUnicode.msg');
      const testMsg = new MsgReader(msgFileBuffer);
      const testMsgInfo = ensureNotNullish(testMsg.getFileData());
      callback({ testMsgInfo });
    }
  });

  generateRegression('A black friday (w tz)');
  generateRegression('A black friday (wo tz)');
  generateRegression('7 days  everyday');
  generateRegression('Appointment sample EST');
  generateRegression('Lanch time  every friday  in 2023 chgs1');
  generateRegression('Lanch time  every friday  in 2023 chgs2');
  generateRegression('Lanch time  every friday  in 2023 org');
  generateRegression('A daily 1');
  generateRegression('A monthly 1');
  generateRegression('A weekly 1');
  generateRegression('A yearly 1');
  generateRegression('Friday Lunch');
  generateRegression('attachmentFiles');
  generateRegression('attachmentsOrder');
  generateRegression('Many entities');

  function generateRegression(msgName: string) {
    describe(`${msgName}.msg`, function () {
      it('exact match with pre rendered data (except on compressedRtf)',
        () => run(({ testMsgInfo }) => {
          const msg = removeCompressedRtf(testMsgInfo);
          use(msg, `test/${msgName}.json`);
        })
      );

      function run(callback: (arg: { testMsgInfo: FieldsData }) => void) {
        const msgFileBuffer = fs.readFileSync(`test/${msgName}.msg`);
        const testMsg = new MsgReader(msgFileBuffer);
        const testMsgInfo = ensureNotNullish(testMsg.getFileData());
        callback({ testMsgInfo });
      }
    });
  }
});

describe('Burner', function () {
  interface FsEntry {
    name: string;
    type: TypeEnum;
    length: number;
    children: number[];
    binaryProvider?: (() => Uint8Array);
  }

  // path: `file`, `dir/file`, `dir1/dir2/file`
  const burnByFsEntries: (entries: { path: string, binary?: ArrayLike<number> }[]) => { array: Uint8Array } = (entries) => {
    const fsEntries: FsEntry[] = [
      {
        name: "Root Entry",
        type: TypeEnum.ROOT,
        length: 0,
        children: [] as number[],
      },
    ];

    for (const entry of entries) {
      const { path, binary } = entry;
      const elements = path.split('/');

      let parentIndex = 0;
      for (let index = 0; index < elements.length - 1; index++) {
        const name = elements[index];
        const hitIndex = fsEntries[parentIndex].children.find(it => fsEntries[it].name === name);
        if (hitIndex === undefined) {
          const newIndex = fsEntries.length;
          fsEntries.push({
            name,
            type: TypeEnum.DIRECTORY,
            length: 0,
            children: [] as number[],
          });
          fsEntries[parentIndex].children.push(newIndex);
          parentIndex = newIndex;
        } else {
          parentIndex = hitIndex;
        }
      }

      {
        const newIndex = fsEntries.length;

        fsEntries.push({
          name: elements[elements.length - 1],
          type: TypeEnum.DOCUMENT,
          length: binary ? binary.length : 0,
          binaryProvider: binary ? () => new Uint8Array(binary) : undefined,
          children: [],
        });

        fsEntries[parentIndex].children.push(newIndex);
      }
    }

    const array = burn(fsEntries);
    return { array: array };
  };

  const burnAFileHavingLengthBy: (x: number) => { writeData: Uint8Array, array: Uint8Array } = (x) => {
    const writeData = new Uint8Array(x);
    for (let t = 0; t < writeData.length; t++) {
      writeData[t] = ((t ^ (t / 257) ^ (t / 65537) ^ (t / 1048573)) & 255);
    }

    const array = burn([
      {
        name: "Root Entry",
        type: TypeEnum.ROOT,
        length: 0,
        children: [1],
      },
      {
        name: "file",
        type: TypeEnum.DOCUMENT,
        length: x,
        binaryProvider: () => writeData,
      }
    ]);

    return { writeData, array };
  };

  const files10 = [
    { path: "file1", binary: new Uint8Array(Buffer.from("data1")) },
    { path: "file2", binary: new Uint8Array(Buffer.from("data2")) },
    { path: "file3", binary: new Uint8Array(Buffer.from("data3")) },
    { path: "file4", binary: new Uint8Array(Buffer.from("data4")) },
    { path: "file5", binary: new Uint8Array(Buffer.from("data5")) },
    { path: "file6", binary: new Uint8Array(Buffer.from("data6")) },
    { path: "file7", binary: new Uint8Array(Buffer.from("data7")) },
    { path: "file8", binary: new Uint8Array(Buffer.from("data8")) },
    { path: "file9", binary: new Uint8Array(Buffer.from("data9")) },
    { path: "file10", binary: new Uint8Array(Buffer.from("data10")) },
  ];

  const dirs3_10 = [
    { path: "d1/e1/file1", binary: new Uint8Array(Buffer.from("data1")) },
    { path: "d1/e2/file2", binary: new Uint8Array(Buffer.from("data2")) },
    { path: "d2/e1/file3", binary: new Uint8Array(Buffer.from("data3")) },
    { path: "d2/e2/file4", binary: new Uint8Array(Buffer.from("data4")) },
    { path: "d3/e1/file5", binary: new Uint8Array(Buffer.from("data5")) },
    { path: "d3/e2/file6", binary: new Uint8Array(Buffer.from("data6")) },
    { path: "d1/e1/file7", binary: new Uint8Array(Buffer.from("data7")) },
    { path: "d2/e1/file8", binary: new Uint8Array(Buffer.from("data8")) },
    { path: "d3/e1/file9", binary: new Uint8Array(Buffer.from("data9")) },
    { path: "d1/e1/file10", binary: new Uint8Array(Buffer.from("data10")) },
  ];

  describe('Compare file contents among Burner/Reader', function () {
    describe('file size', function () {
      it('file size 0', function () { testIt(0); });
      it('file size 1', function () { testIt(1); });
      it('file size 63', function () { testIt(63); });
      it('file size 64 (minifat sector size)', function () { testIt(64); });
      it('file size 65', function () { testIt(65); });
      it('file size 511', function () { testIt(511); });
      it('file size 512 (fat sector size)', function () { testIt(512); });
      it('file size 513', function () { testIt(513); });
      it('file size 65537', function () { testIt(65537); });

      function testIt(length: number) {
        return runReaderWith(
          burnAFileHavingLengthBy(length)
        );
      };

      function runReaderWith(arg: { writeData: Uint8Array, array: Uint8Array }) {
        const { writeData, array } = arg;
        const reader = new Reader(array);
        reader.parse();

        const readData = reader.rootFolder().readFile("file");
        assert.deepStrictEqual(readData, writeData);
      };
    });

    describe('tree builder', function () {
      it('files10', function () { testIt(files10); });
      it('dirs3_10', function () { testIt(dirs3_10); });

      function testIt(entries: { path: string, binary: Uint8Array }[]) {
        return runReaderWith(
          burnByFsEntries(entries).array,
          entries
        );
      };

      function runReaderWith(array: Uint8Array, entries: { path: string, binary: Uint8Array }[]) {
        const reader = new Reader(array);
        reader.parse();

        const loadedEntries: { path: string, binary: Uint8Array }[] = [];

        walk(reader.rootFolder(), "");

        assert.deepStrictEqual(sort(loadedEntries), sort(entries));

        function walk(folder: CFolder, prefix: string) {
          for (const subFolder of folder.subFolders()) {
            walk(subFolder, prefix + subFolder.name + "/");
          }

          for (const fileSet of folder.fileNameSets()) {
            const path = `${prefix}${fileSet.name}`;
            loadedEntries.push({
              path: path,
              binary: fileSet.provider(),
            });
          }
        }

        function sort<T extends { path: string }>(array: T[]) {
          return [...array].sort((a, b) => a.path.localeCompare(b.path));
        }
      };
    });
  });

  (useValidateCompoundFile ? describe : describe.skip)('validateCompoundFile', function () {
    describe("file size", function () {
      it('file size 0', function () { return testIt(0); });
      it('file size 1', function () { return testIt(1); });
      it('file size 63', function () { return testIt(63); });
      it('file size 64 (minifat sector size)', function () { return testIt(64); });
      it('file size 65', function () { return testIt(65); });
      it('file size 511', function () { return testIt(511); });
      it('file size 512 (fat sector size)', function () { return testIt(512); });
      it('file size 513', function () { return testIt(513); });
      it('file size 65537', function () { return testIt(65537); });

      async function testIt(length: number) {
        await runValidateCompoundFileAsync(
          {
            binary: burnAFileHavingLengthBy(length).array,
          }
        );
      }
    });

    describe("tree builder", function () {
      it('files10', function () { testIt(files10); });
      it('dirs3_10', function () { testIt(dirs3_10); });

      async function testIt(entries: { path: string, binary: Uint8Array }[]) {
        await runValidateCompoundFileAsync(
          {
            binary: burnByFsEntries(entries).array,
          }
        );
      }
    });
  });
});

describe('toHexStr', function () {
  it('tests', function () {
    assert.strictEqual(toHexStr(0x00, 2), "00");
    assert.strictEqual(toHexStr(0x01, 2), "01");
    assert.strictEqual(toHexStr(0x10, 2), "10");
    assert.strictEqual(toHexStr(0x11, 2), "11");
    assert.strictEqual(toHexStr(0x0000, 4), "0000");
    assert.strictEqual(toHexStr(0x1234, 4), "1234");
    assert.strictEqual(toHexStr(0x5678, 4), "5678");
    assert.strictEqual(toHexStr(0x9abc, 4), "9abc");
    assert.strictEqual(toHexStr(0xdef0, 4), "def0");
    assert.strictEqual(toHexStr(0xfeff, 4), "feff");
    assert.strictEqual(toHexStr(0xfffe, 4), "fffe");
    assert.strictEqual(toHexStr(0xa5a5, 4), "a5a5");
    assert.strictEqual(toHexStr(0x5a5a, 4), "5a5a");
  });
});

describe('DataStreamReader', function () {
  describe('byteOffset', function () {
    it('little.buffer.offset.readInt32Array', function () {
      const buffer = new ArrayBuffer(32);
      new Int32Array(buffer).set([0, 1, 2, 3, 4, 5, 6, 7]);
      const array2 = new Uint8Array(buffer, 8);

      const ds = new DataStreamReader(array2, 8);
      assert.deepEqual(Array.from(ds.readInt32Array(2)), [4, 5]);
    });
  });

  describe('0 to 15', function () {
    const buff = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    it('little.readUint32', function () {
      const ds = new DataStreamReader(buff, 0);
      assert.strictEqual(ds.readUint32(), 0x03020100);
      assert.strictEqual(ds.readUint32(), 0x07060504);
      assert.strictEqual(ds.readUint32(), 0x0b0a0908);
      assert.strictEqual(ds.readUint32(), 0x0f0e0d0c);
    });
    it('little.offset.readUint32', function () {
      const ds = new DataStreamReader(buff, 4);
      assert.strictEqual(ds.readUint32(), 0x07060504);
      assert.strictEqual(ds.readUint32(), 0x0b0a0908);
      assert.strictEqual(ds.readUint32(), 0x0f0e0d0c);
    });

    it('little.readUint32Array', function () {
      const ds = new DataStreamReader(buff, 0);
      assert.deepEqual(Array.from(ds.readUint32Array(4)), [0x03020100, 0x07060504, 0x0b0a0908, 0x0f0e0d0c]);
    });
    it('little.readInt32Array', function () {
      const ds = new DataStreamReader(buff, 0);
      assert.deepEqual(Array.from(ds.readInt32Array(4)), [0x03020100, 0x07060504, 0x0b0a0908, 0x0f0e0d0c]);
    });
    it('little.readUint16Array', function () {
      const ds = new DataStreamReader(buff, 0);
      assert.deepEqual(Array.from(ds.readUint16Array(8)), [0x0100, 0x0302, 0x0504, 0x0706, 0x0908, 0x0b0a, 0x0d0c, 0x0f0e]);
    });
    it('little.readInt16Array', function () {
      const ds = new DataStreamReader(buff, 0);
      assert.deepEqual(Array.from(ds.readInt16Array(8)), [0x0100, 0x0302, 0x0504, 0x0706, 0x0908, 0x0b0a, 0x0d0c, 0x0f0e]);
    });

    it('little.readUint32Array +offset', function () {
      const ds = new DataStreamReader(buff, 8);
      assert.deepEqual(Array.from(ds.readUint32Array(2)), [0x0b0a0908, 0x0f0e0d0c]);
    });
    it('little.readInt32Array +offset', function () {
      const ds = new DataStreamReader(buff, 8);
      assert.deepEqual(Array.from(ds.readInt32Array(2)), [0x0b0a0908, 0x0f0e0d0c]);
    });
    it('little.readUint16Array +offset', function () {
      const ds = new DataStreamReader(buff, 8);
      assert.deepEqual(Array.from(ds.readUint16Array(4)), [0x0908, 0x0b0a, 0x0d0c, 0x0f0e]);
    });
    it('little.readInt16Array +offset', function () {
      const ds = new DataStreamReader(buff, 8);
      assert.deepEqual(Array.from(ds.readInt16Array(4)), [0x0908, 0x0b0a, 0x0d0c, 0x0f0e]);
    });
  });
});


describe('msftUuidStringify', function () {
  it("basic", function () {
    assert.strictEqual(
      msftUuidStringify(
        [
          0x33, 0x22, 0x11, 0x00, 0x55, 0x44, 0x77, 0x66,
          0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff
        ],
        0
      ),
      "00112233-4455-6677-8899-aabbccddeeff"
    );
    assert.strictEqual(
      msftUuidStringify(
        [
          0xff,
          0x33, 0x22, 0x11, 0x00, 0x55, 0x44, 0x77, 0x66,
          0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff
        ],
        1
      ),
      "00112233-4455-6677-8899-aabbccddeeff"
    );
  });
});

describe('toHex', function () {
  it("toHex1", function () {
    assert.strictEqual(toHex1(0x12), "12");
    assert.strictEqual(toHex1(0xab), "ab");
  });
  it("toHex2", function () {
    assert.strictEqual(toHex2(0x1234), "1234");
    assert.strictEqual(toHex2(0xabcd), "abcd");
  });
  it("toHex4", function () {
    assert.strictEqual(toHex4(0x12345678), "12345678");
    assert.strictEqual(toHex4(0xabcdef01), "abcdef01");
  });
});

function removeCompressedRtf(msg: FieldsData): FieldsData {
  const attachments = (msg.attachments || []).map(
    sub => {
      const newSub = Object.assign({}, sub);
      const { innerMsgContentFields } = newSub;
      if (innerMsgContentFields) {
        newSub.innerMsgContentFields = removeCompressedRtf(innerMsgContentFields);
      }
      return newSub;
    }
  );

  const newMsg = Object.assign({}, msg);
  delete newMsg.compressedRtf;
  newMsg.attachments = attachments;
  return newMsg;
}

function runAppAsync(file: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
    });
    child.on('exit', () => {
      if (child.exitCode === 0) {
        resolve();
      }
      else {
        reject(new Error(`returned exitCode: ${child.exitCode}`));
      }
    });
  });
}

async function runValidateCompoundFileAsync(opt: { binary?: Uint8Array }): Promise<void> {
  if (opt.binary) {
    const msgPath = temp.path({ suffix: '.msg' });
    fs.writeFileSync(msgPath, opt.binary);
    await runAppAsync(join(__dirname, "../tools/ValidateCompoundFile.exe"), [msgPath]);
  }
  else {
    throw new Error("Pass binary");
  }
}

function use(testMsgInfo: FieldsData, jsonFilePath: string) {
  if (generateJsonData) {
    fs.writeFileSync(jsonFilePath, JSON.stringify(testMsgInfo, null, 1));
  }
  else {
    assert.deepStrictEqual(
      testMsgInfo,
      JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'))
    );
  }
}

function useRtf(testMsgInfo: FieldsData, rtfFilePath: string) {
  const { compressedRtf } = testMsgInfo;
  const rtf = decompressRTF(Array.from(compressedRtf || []));

  if (generateJsonData) {
    fs.writeFileSync(rtfFilePath, Buffer.from(rtf));
  }
  else {
    assert.deepStrictEqual(
      rtf,
      [...fs.readFileSync(rtfFilePath)]
    );
  }
}

function ensureNotNullish<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("Unexpected nullish value");
  }
  else {
    return value;
  }
}
