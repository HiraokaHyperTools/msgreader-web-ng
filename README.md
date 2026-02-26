# msgreader-web-ng

[![npm](https://img.shields.io/npm/v/@kenjiuno/msgreader-web-ng)](https://www.npmjs.com/package/@kenjiuno/msgreader-web-ng)

Outlook Item File (.msg) reader in JavaScript npm Module

Original projects:

- https://github.com/FreiraumIO/msgreader
- https://github.com/ykarpovich/msg.reader
- https://github.com/HiraokaHyperTools/msgreader

This is a special version of msgreader.
It removed the dependency of `iconv-lite` package.
It is said that the `iconv-lite` package relies on Node.js-specific APIs like `buffer` and `string_decoder`.
This version will help to run msgreader on both a web browser and Node.js runtimes.

And also it is published as a [npm package](https://www.npmjs.com/package/@kenjiuno/msgreader-web-ng).

Links: [_typedoc documentation_](https://hiraokahypertools.github.io/msgreader-web-ng/typedoc/)
