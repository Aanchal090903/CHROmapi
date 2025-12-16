const puppeteer = require('puppeteer');

describe('Puppeteer Test', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch();
        page = await browser.newPage();
    });

    afterAll(async () => {
        await browser.close();
    });

    test('hello world!', async () => {
        await page.goto('http://example.com');
        const title = await page.title();
        expect(title).toBe('Example Domain');
    });
});