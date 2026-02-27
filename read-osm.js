const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'osm.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const tables = Object.values(data);

console.log(`osm.json — ${tables.length} tables\n`);

for (const entry of tables) {
  const { table, schema, metadata, data: rows } = entry;
  const fields = metadata.schemaDefinition.fields.map((f) => `${f.name}:${f.type}`).join(', ');
  console.log(`[${schema}.${table}]`);
  console.log(`  records : ${metadata.totalRecords}`);
  console.log(`  fields  : ${fields}`);
  if (rows && rows.length > 0) {
    console.log(`  sample  : ${JSON.stringify(rows[0])}`);
  }
  console.log();
}
