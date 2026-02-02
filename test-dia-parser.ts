import * as fs from 'fs';
import { extractText } from 'unpdf';
import { diaParser, hasMinimalDiaFields } from './lib/receipts/parsers/dia';

async function testParser() {
  const pdfPath = 'docs/PARSERS/Templates/Dia.pdf';
  const buffer = fs.readFileSync(pdfPath);
  const uint8 = new Uint8Array(buffer);
  const result = await extractText(uint8);
  const pages = Array.isArray(result.text) ? result.text : [result.text];
  const text = pages.join('\n');

  console.log('=== CAN PARSE ===');
  console.log(diaParser.canParse(text));

  console.log('\n=== PARSE RESULT ===');
  const { extracted } = diaParser.parse(text);
  console.log('Store:', extracted.store_name);
  console.log('Date:', extracted.receipt_date, '/', extracted.receipt_date_iso);
  console.log('Time:', extracted.receipt_time);
  console.log('Total:', extracted.total_amount);
  console.log('VAT Total:', extracted.taxes_total_cuota);
  console.log('Items count:', extracted.items?.length);

  console.log('\n=== ITEMS ===');
  let sum = 0;
  extracted.items?.forEach((item, i) => {
    console.log(i+1, item.description, 'qty:', item.quantity, 'unit:', item.price_per_unit, 'total:', item.total_price);
    sum += item.total_price;
  });
  console.log('\nCalculated sum:', sum.toFixed(2));
  console.log('Receipt total:', extracted.total_amount);

  console.log('\n=== VALIDATION ===');
  console.log('hasMinimalDiaFields:', hasMinimalDiaFields(extracted));
}

testParser().catch(console.error);
