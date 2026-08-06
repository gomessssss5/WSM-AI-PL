const fs = require("fs");
const lines = fs.readFileSync("src/components/MainHome.tsx", "utf8").split("\n");

const idx2Start = lines.findIndex(l => l.includes('key="card-2"'));
if (idx2Start !== -1) {
  // Find where currentCardIndex === 1 starts
  const idx1StartCond = lines.findIndex(l => l.includes(') : currentCardIndex === 1 ? ('));
  
  if (idx1StartCond !== -1) {
    lines[idx1StartCond] = '                ) : (';
    
    // Find where the `) : (` block for card-2 begins
    // It's the `) : (` just before `key="card-2"`
    let card2BlockStart = idx2Start - 1;
    while (!lines[card2BlockStart].includes(') : (')) {
      card2BlockStart--;
    }
    
    let card2BlockEnd = card2BlockStart;
    let stack = 1; // Since we found ') : (' we are entering a new block implicitly? Actually, it's just `) : (` and then `<motion.div>` ... `</motion.div>` `)}`
    while (card2BlockEnd < lines.length) {
      if (lines[card2BlockEnd].includes(')}')) {
        break;
      }
      card2BlockEnd++;
    }
    
    lines.splice(card2BlockStart, card2BlockEnd - card2BlockStart);
  }
}

// Remove the 3rd dot from pagination everywhere
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('Pagination indicators')) {
    // The next 3 lines are the spans. We can remove the third one.
    // Actually, let's just find `<span ... />` that's the 3rd one.
    lines.splice(i+3, 1); // Remove the third dot (which is at i+3 assuming i+1, i+2, i+3 are spans)
  }
}

fs.writeFileSync("src/components/MainHome.tsx", lines.join("\n"));
console.log("Fixed carousel");
