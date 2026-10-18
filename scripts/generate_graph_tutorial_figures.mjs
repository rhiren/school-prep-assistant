import { mkdirSync, writeFileSync } from 'node:fs';

const dir = 'public/content/math/course3/images';
mkdirSync(dir, { recursive: true });
for (const { name, slope, ymin, title, rise } of [
  { name: 'positive', slope: 1.5, ymin: -5, title: 'y = (3/2)x - 2', rise: 3 },
  { name: 'negative', slope: -0.5, ymin: -6, title: 'y = (-1/2)x - 2', rise: -1 },
]) {
  const X = x => 80 + (x + 2) * 32;
  const Y = y => 380 - (y - ymin) * 32;
  const parts = [];
  for(let x=-2;x<=8;x++) {
    parts.push(`<path d="M${X(x)} 60V380" stroke="#dce3e5"/>`);
    if(x!==0) parts.push(`<text x="${X(x)}" y="${Y(0)+18}" text-anchor="middle">${x}</text>`);
  }
  for(let y=ymin;y<=ymin+10;y++) {
    parts.push(`<path d="M80 ${Y(y)}H400" stroke="#dce3e5"/>`);
    if(y!==0) parts.push(`<text x="${X(0)-10}" y="${Y(y)+5}" text-anchor="end">${y}</text>`);
  }
  parts.push(`<path d="M80 ${Y(0)}H414 M${X(0)} 390V50" stroke="#374151" stroke-width="2"/>`);
  parts.push(`<text x="423" y="${Y(0)+5}">x</text><text x="${X(0)-6}" y="43">y</text>`);
  parts.push(`<path d="M${X(-2)} ${Y(slope*(-2)-2)}L${X(8)} ${Y(slope*8-2)}" clip-path="url(#grid)" stroke="#16636b" stroke-width="3"/>`);
  parts.push(`<path d="M${X(0)} ${Y(-2)}H${X(2)}V${Y(-2+rise)}" fill="none" stroke="#a23d55" stroke-width="2" stroke-dasharray="5 3"/>`);
  parts.push(`<text x="${X(1)}" y="${Y(-2)+(rise>0?23:-10)}" text-anchor="middle" fill="#8b2540">right 2</text>`);
  parts.push(`<text x="${X(2)+10}" y="${Y(-2+rise/2)+(rise>0?34:5)}" fill="#8b2540">${rise>0?'up 3':'down 1'}</text>`);
  for(const x of [0,2,4]) {
    const y=slope*x-2;
    parts.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="5" fill="#16636b" stroke="white" stroke-width="2"/>`);
    const labelOffset = rise < 0 ? (x === 0 ? -30 : x === 2 ? 26 : -12) : -12;
    parts.push(`<text x="${X(x)+9}" y="${Y(y)+labelOffset}" font-weight="bold" fill="#124c52">(${x}, ${y})</text>`);
  }
  writeFileSync(`${dir}/graph-linear-${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 440" role="img" aria-labelledby="title desc">
<title id="title">${title}</title><desc id="desc">One unit per grid square. Start at (0, -2), then move right 2 and ${rise>0?'up 3':'down 1'}.</desc>
<defs><clipPath id="grid"><rect x="80" y="60" width="320" height="320"/></clipPath></defs>
<rect width="500" height="440" fill="white"/>
<g font-family="Arial, sans-serif" font-size="15" fill="#374151">
<text x="250" y="24" text-anchor="middle" font-size="20" font-weight="bold">${title}</text>
${parts.join('\n')}
<text x="250" y="422" text-anchor="middle">Each grid square = 1 unit</text></g></svg>\n`);
}
