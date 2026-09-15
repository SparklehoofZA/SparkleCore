const json1 = `{
  "key": "value",
  "key2": "truncated strin`;
try {
  JSON.parse(json1.replace(/[\n\r]+/g, ' '));
} catch (e) {
  console.log("Error 1:", e.message);
}
