import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';

function renderHtml(r) {
  const b = r.basics || {};
  const profiles = (b.profiles || [])
    .map(p => `<a href="${p.url}">${p.network}</a>`)
    .join(' · ');

  const contact = [
    b.location?.city && `${b.location.city}${b.location.countryCode ? ', ' + b.location.countryCode : ''}`,
    b.url && `<a href="${b.url}">${b.url.replace('https://', '')}</a>`,
    profiles,
  ].filter(Boolean).join(' · ');

  const work = (r.work || []).map(w => {
    const dates = [w.startDate?.slice(0, 7), w.endDate?.slice(0, 7) || 'Present'].join(' – ');
    const highlights = (w.highlights || []).map(h => `<li>${h}</li>`).join('');
    return `
      <div class="entry">
        <div class="entry-header">
          <div>
            <strong>${w.position}</strong> · <span class="muted">${w.name}</span>
          </div>
          <div class="date">${dates}</div>
        </div>
        ${w.summary ? `<p class="summary">${w.summary}</p>` : ''}
        ${highlights ? `<ul>${highlights}</ul>` : ''}
      </div>`;
  }).join('');

  const education = (r.education || []).map(e => `
    <div class="entry">
      <div class="entry-header">
        <div><strong>${e.institution}</strong></div>
      </div>
      <p class="summary">${e.studyType} in ${e.area}</p>
    </div>`).join('');

  const skills = (r.skills || []).map(s =>
    `<span><strong>${s.name}:</strong> ${s.keywords.join(', ')}</span>`
  ).join(' · ');

  const awards = (r.awards || []).map(a => `
    <div class="entry">
      <div class="entry-header">
        <div><strong>${a.title}</strong> · <span class="muted">${a.awarder}</span></div>
        <div class="date">${a.date}</div>
      </div>
      ${a.summary ? `<p class="summary">${a.summary}</p>` : ''}
    </div>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { font-size: 11px; }
  body {
    font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
    color: #1a1a1a;
    line-height: 1.45;
    padding: 0;
  }
  a { color: #1a1a1a; text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* Header */
  .header { text-align: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1.5px solid #1a1a1a; }
  .header h1 { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 2px; }
  .header .label { font-size: 12px; color: #555; margin-bottom: 6px; }
  .header .contact { font-size: 10px; color: #444; }
  .header .contact a { color: #444; }

  /* Sections */
  .section { margin-bottom: 10px; }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    border-bottom: 0.75px solid #ccc;
    padding-bottom: 2px;
    margin-bottom: 6px;
    color: #1a1a1a;
  }

  /* Entries */
  .entry { margin-bottom: 8px; }
  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .entry-header strong { font-size: 11px; }
  .date { font-size: 10px; color: #555; white-space: nowrap; flex-shrink: 0; }
  .muted { color: #555; }
  .summary { font-size: 10.5px; color: #333; margin: 2px 0 3px 0; }

  /* Lists */
  ul { margin: 2px 0 0 14px; padding: 0; }
  li { font-size: 10.5px; color: #333; margin-bottom: 1px; padding-left: 2px; }
  li::marker { color: #999; }

  /* Skills */
  .skills-line { font-size: 10.5px; color: #333; line-height: 1.6; }
  .skills-line strong { color: #1a1a1a; }
</style>
</head>
<body>
  <div class="header">
    <h1>${b.name || ''}</h1>
    ${b.label ? `<div class="label">${b.label}</div>` : ''}
    <div class="contact">${contact}</div>
  </div>

  ${b.summary ? `
  <div class="section">
    <p class="summary" style="font-size: 10.5px; color: #333;">${b.summary}</p>
  </div>` : ''}

  ${work ? `
  <div class="section">
    <div class="section-title">Experience</div>
    ${work}
  </div>` : ''}

  ${education ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${education}
  </div>` : ''}

  ${skills ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills-line">${skills}</div>
  </div>` : ''}

  ${awards ? `
  <div class="section">
    <div class="section-title">Awards</div>
    ${awards}
  </div>` : ''}
</body>
</html>`;
}

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
  const html = renderHtml(resume);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: output,
    format: 'A4',
    margin: { top: '0.4in', right: '0.5in', bottom: '0.4in', left: '0.5in' },
    printBackground: true,
  });
  await page.close();
  console.log(`Generated ${output}`);
}

await browser.close();
