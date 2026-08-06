const fs = require('fs');
let code = fs.readFileSync('src/utils/excelGenerator.ts', 'utf8');

code = code.replace(
  /const num = Number\(cleanCell\.replace\(',', '\.'\)\);\s*if \(\!isNaN\(num\) && cleanCell !== '' && !cleanCell\.startsWith\('0'\) && cleanCell\.length < 15\) \{\s*return num;\s*\}/g,
  `const isCurrency = /^R?\\$\\s*[\\d.,]+$/.test(cleanCell.trim());
        const cleanedStr = isCurrency ? cleanCell.replace(/[^\\d.,]/g, '') : cleanCell;
        // If it looks like Brazilian format (1.000,00), convert to standard (1000.00)
        const parseNumStr = cleanedStr.includes(',') && cleanedStr.indexOf(',') > cleanedStr.lastIndexOf('.')
          ? cleanedStr.replace(/\\./g, '').replace(',', '.')
          : cleanedStr.replace(/,/g, '');
          
        const num = Number(parseNumStr);
        if (!isNaN(num) && cleanedStr !== '' && !cleanedStr.startsWith('0') && cleanedStr.length < 15) {
          // If it was currency, we prepend a special marker to know it's currency
          if (isCurrency) return '___CURRENCY___' + num;
          return num;
        }`
);

// Then when writing rows, if cell starts with ___CURRENCY___
code = code.replace(
  /if \(typeof cell\.value === 'number'\) \{\s*cell\.alignment = \{ vertical: 'middle', horizontal: 'right' \};\s*\} else \{\s*cell\.alignment = \{ vertical: 'middle', horizontal: 'left', wrapText: true \};\s*\}/g,
  `if (typeof cell.value === 'number') {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (typeof cell.value === 'string' && cell.value.startsWith('___CURRENCY___')) {
        cell.value = Number(cell.value.replace('___CURRENCY___', ''));
        cell.numFmt = '"R$" #,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }`
);

fs.writeFileSync('src/utils/excelGenerator.ts', code);
