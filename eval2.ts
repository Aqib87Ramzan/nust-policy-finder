import { ugChunks } from './src/data/Ugchunk';
const qs = {
  deferment: [20, 33, 34, 41, 48, 56],
  drop: [13, 14, 23, 27, 36, 39, 40, 42],
  intern: [7, 8, 12, 21],
  cgpa: [13, 26, 36, 43, 45, 46]
};
const targets = new Set([...qs.deferment, ...qs.drop, ...qs.intern, ...qs.cgpa]);
ugChunks.forEach(c => {
  if (targets.has(c.id)) {
    console.log(`\n--- DOC ${c.id} ---\n${c.text.substring(0, 300)}`);
  }
});