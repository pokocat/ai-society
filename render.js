const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const dir = '/home/user/ai-society/';
const svg = fs.readFileSync(dir + 'admin-prototype.svg');
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 2880 },
  font: { loadSystemFonts: true, defaultFontFamily: 'WenQuanYi Zen Hei' },
  background: '#05070D',
});
const png = resvg.render().asPng();
fs.writeFileSync(dir + 'admin-prototype.png', png);
console.log('PNG written, bytes:', png.length);
