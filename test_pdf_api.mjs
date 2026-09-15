import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
const doc = await pdfjsLib.getDocument({ data: new Uint8Array() }).promise.catch(e => e);
console.log("PDF loading tested.");
