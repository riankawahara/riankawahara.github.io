import { readFile } from 'node:fs/promises';
import { render } from 'resumed';
import * as theme from 'jsonresume-theme-even';
import puppeteer from 'puppeteer';

const resumes = [
  { input: 'resume.json', output: 'public/resume/resume.pdf' },
  { input: 'resume.ja.json', output: 'public/resume/resume-ja.pdf' },
];

const browser = await puppeteer.launch({
  headless: true,
  args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
});

for (const { input, output } of resumes) {
  const resume = JSON.parse(await readFile(input, 'utf-8'));
  const html = await render(resume, theme);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: output,
    format: 'A4',
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    printBackground: true,
  });
  await page.close();
  console.log(`Generated ${output}`);
}

await browser.close();
