# msgreader-web-ng

[![npm](https://img.shields.io/npm/v/@kenjiuno/msgreader-web-ng)](https://www.npmjs.com/package/@kenjiuno/msgreader-web-ng)

Links: [_typedoc documentation_](https://hiraokahypertools.github.io/msgreader-web-ng/typedoc/) | [online demo](https://hiraokahypertools.github.io/msgreader-web-ng_demo/)

Outlook Item File (.msg) reader in JavaScript npm Module

Original projects:

- https://github.com/FreiraumIO/msgreader
- https://github.com/ykarpovich/msg.reader
- https://github.com/HiraokaHyperTools/msgreader

About modernization:

- This is a special version of msgreader.
- It removed the dependency of `iconv-lite` package.
- It is said that the `iconv-lite` package relies on Node.js-specific APIs like `buffer` and `string_decoder`.
- This version will help to run msgreader on both a web browser (using Vite or such) and Node.js runtimes.

And also it is published as a [npm package](https://www.npmjs.com/package/@kenjiuno/msgreader-web-ng).

Usage:

```ts
import { MsgReader } from "@kenjiuno/msgreader-web-ng";

const testMsg = new MsgReader(arrayBuffer);
testMsg.parserConfig = {
    ansiEncoding: ansiEncoding,
    includeRawProps: includeRawProps,
};
const testMsgInfo = testMsg.getFileData();
// ...
```
