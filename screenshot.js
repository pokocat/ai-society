const { chromium } = require('playwright');
const dir = '/home/user/ai-society/';
const pages = ['dashboard','members','network','commission','rules','risk','ai','training'];
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('file://' + dir + 'admin-prototype.html', { waitUntil: 'load' });
  // make sidebar/topbar non-sticky so full-page screenshots look right
  await page.addStyleTag({ content: '.sidebar{position:static!important;height:auto!important}.topbar{position:static!important}' });
  for (const pg of pages) {
    await page.evaluate((p) => window.go(p), pg);
    await page.waitForTimeout(350);
    await page.screenshot({ path: dir + 'page-' + pg + '.png', fullPage: true });
    console.log('shot', pg);
  }
  // light theme variant of dashboard
  await page.evaluate(() => window.go('dashboard'));
  await page.evaluate(() => document.body.classList.add('light'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: dir + 'page-dashboard-light.png', fullPage: true });
  console.log('shot dashboard-light');
  await browser.close();
})();
