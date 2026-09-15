const json1 = `{
  "key": "value
  with newline"
}`;
try {
  JSON.parse(json1);
} catch (e) {
  console.log("Error 1:", e.message);
}

const fixed = json1.replace(/[\n\r]+/g, ' ');
try {
  JSON.parse(fixed);
  console.log("Fixed successfully!");
} catch(e) {
  console.log("Error 2:", e.message);
}
