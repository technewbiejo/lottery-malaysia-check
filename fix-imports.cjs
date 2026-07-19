const fs = require('fs');
const files = [...fs.readdirSync('api').map(f => 'api/' + f), 'src/server_db.ts', 'src/scraper.ts'];
files.filter(f => f.endsWith('.ts')).forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content.replace(/from ['"](\.\.?\/[^'"]+)['"]/g, (m, p1) => {
    if (p1.endsWith('.js') || p1.endsWith('.ts')) return m;
    return `from '${p1}.js'`;
  });
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    console.log('Updated ' + f);
  }
});
