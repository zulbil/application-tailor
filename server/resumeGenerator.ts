import puppeteer from "puppeteer";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";

export interface ResumeData {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    headline: string;
  };
  logline: string[];
  experiences: Array<{
    company: string;
    title: string;
    location: string;
    start: string;
    end: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
  }>;
  technologies: string;
  relevantSkills: string[];
}

export interface SectionPreferences {
  title: string;
  hidden: boolean;
}

export interface ResumeSettings {
  template: "modern" | "classic" | "minimal" | "creative";
  primaryColor: string;
  fontFamily: string;
  fontSize: "small" | "medium" | "large";
  sectionOrder: string[];
  sectionPreferences: Record<string, SectionPreferences>;
}

const defaultSectionPreferences: Record<string, SectionPreferences> = {
  summary: { title: "", hidden: false },
  skills: { title: "Skills", hidden: false },
  experience: { title: "Experience", hidden: false },
  education: { title: "Education", hidden: false }
};

const defaultSettings: ResumeSettings = {
  template: "modern",
  primaryColor: "#0f766e",
  fontFamily: "Inter",
  fontSize: "medium",
  sectionOrder: ["summary", "skills", "experience", "education"],
  sectionPreferences: defaultSectionPreferences
};

const fontSizeMap: Record<string, { body: string; heading: string; title: string; small: string }> = {
  small: { body: "9pt", heading: "10pt", title: "18pt", small: "8pt" },
  medium: { body: "11pt", heading: "12pt", title: "24pt", small: "10pt" },
  large: { body: "12pt", heading: "14pt", title: "28pt", small: "11pt" }
};

const fontFamilies: Record<string, string> = {
  "Inter": "'Inter', sans-serif",
  "Roboto": "'Roboto', sans-serif",
  "Open Sans": "'Open Sans', sans-serif",
  "Lato": "'Lato', sans-serif",
  "Georgia": "Georgia, serif",
  "Times New Roman": "'Times New Roman', serif"
};

function generateModernHTML(data: ResumeData, settings: ResumeSettings): string {
  const font = fontFamilies[settings.fontFamily] || fontFamilies["Inter"];
  const color = settings.primaryColor || "#0f766e";
  const sizes = fontSizeMap[settings.fontSize] || fontSizeMap.medium;
  const prefs = { ...defaultSectionPreferences, ...settings.sectionPreferences };
  
  const getSectionTitle = (key: string, defaultTitle: string) => {
    const pref = prefs[key];
    if (!pref) return defaultTitle;
    return pref.title !== undefined ? pref.title : defaultTitle;
  };
  
  const isHidden = (key: string) => prefs[key]?.hidden === true;
  
  const sections: Record<string, string> = {
    summary: isHidden("summary") ? "" : `
      <section class="section">
        ${getSectionTitle("summary", "") ? `<h2>${getSectionTitle("summary", "")}</h2>` : ""}
        <ul class="summary-list">
          ${data.logline.map(line => `<li>${line}</li>`).join("")}
        </ul>
      </section>
    `,
    skills: isHidden("skills") ? "" : `
      <section class="section">
        ${getSectionTitle("skills", "Skills") ? `<h2>${getSectionTitle("skills", "Skills")}</h2>` : ""}
        <p class="skills">${data.relevantSkills?.join(" • ") || data.technologies}</p>
      </section>
    `,
    experience: isHidden("experience") ? "" : `
      <section class="section">
        ${getSectionTitle("experience", "Experience") ? `<h2>${getSectionTitle("experience", "Experience")}</h2>` : ""}
        ${data.experiences.map(exp => `
          <div class="experience">
            <div class="exp-header">
              <div>
                <strong>${exp.title}</strong>
                <span class="company">${exp.company}</span>
              </div>
              <div class="dates">${exp.start} - ${exp.end}</div>
            </div>
            <div class="location">${exp.location}</div>
            <ul>
              ${exp.bullets.map(bullet => `<li>${bullet}</li>`).join("")}
            </ul>
          </div>
        `).join("")}
      </section>
    `,
    education: isHidden("education") ? "" : `
      <section class="section">
        ${getSectionTitle("education", "Education") ? `<h2>${getSectionTitle("education", "Education")}</h2>` : ""}
        ${data.education.map(edu => `
          <div class="education">
            <div class="edu-header">
              <strong>${edu.degree} in ${edu.field}</strong>
              <span class="dates">${edu.startDate} - ${edu.endDate}</span>
            </div>
            <div class="school">${edu.school}</div>
          </div>
        `).join("")}
      </section>
    `
  };

  const orderedSections = (settings.sectionOrder || defaultSettings.sectionOrder)
    .filter(key => !isHidden(key))
    .map(key => sections[key] || "")
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: ${font};
          font-size: ${sizes.body};
          line-height: 1.5;
          color: #1f2937;
          padding: 40px 50px;
          max-width: 8.5in;
        }
        .header {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid ${color};
        }
        h1 {
          font-size: ${sizes.title};
          font-weight: 700;
          color: ${color};
          margin-bottom: 8px;
        }
        .contact {
          font-size: ${sizes.small};
          color: #6b7280;
        }
        .headline {
          font-size: ${sizes.body};
          color: #374151;
          margin-top: 8px;
        }
        .section {
          margin-bottom: 20px;
        }
        h2 {
          font-size: ${sizes.heading};
          font-weight: 600;
          color: ${color};
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
          padding-bottom: 4px;
          border-bottom: 1px solid #e5e7eb;
        }
        .summary-list {
          list-style: none;
          padding: 0;
        }
        .summary-list li {
          padding: 4px 0;
          padding-left: 16px;
          position: relative;
        }
        .summary-list li::before {
          content: "▸";
          position: absolute;
          left: 0;
          color: ${color};
        }
        .skills {
          font-size: ${sizes.small};
          color: #4b5563;
        }
        .experience, .education {
          margin-bottom: 14px;
        }
        .exp-header, .edu-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .company, .school {
          color: #6b7280;
          margin-left: 8px;
        }
        .dates {
          font-size: ${sizes.small};
          color: #9ca3af;
        }
        .location {
          font-size: ${sizes.small};
          color: #9ca3af;
          margin-bottom: 6px;
        }
        ul {
          padding-left: 20px;
          margin-top: 6px;
        }
        li {
          margin-bottom: 4px;
          font-size: ${sizes.body};
        }
      </style>
    </head>
    <body>
      <header class="header">
        <h1>${data.profile.firstName} ${data.profile.lastName}</h1>
        <div class="contact">${data.profile.email} • ${data.profile.phone} • ${data.profile.location}</div>
        <div class="headline">${data.profile.headline}</div>
      </header>
      ${orderedSections}
    </body>
    </html>
  `;
}

function generateClassicHTML(data: ResumeData, settings: ResumeSettings): string {
  const font = "'Times New Roman', serif";
  const sizes = fontSizeMap[settings.fontSize] || fontSizeMap.medium;
  const prefs = { ...defaultSectionPreferences, ...settings.sectionPreferences };
  
  const getSectionTitle = (key: string, defaultTitle: string) => {
    const pref = prefs[key];
    if (!pref) return defaultTitle;
    return pref.title !== undefined ? pref.title : defaultTitle;
  };
  
  const isHidden = (key: string) => prefs[key]?.hidden === true;
  
  const sections: Record<string, string> = {
    summary: isHidden("summary") ? "" : `
      <section class="section">
        ${getSectionTitle("summary", "") ? `<h2>${getSectionTitle("summary", "")}</h2>` : ""}
        <ul>${data.logline.map(l => `<li>${l}</li>`).join("")}</ul>
      </section>
    `,
    skills: isHidden("skills") ? "" : `
      <section class="section">
        ${getSectionTitle("skills", "Skills") ? `<h2>${getSectionTitle("skills", "Skills")}</h2>` : ""}
        <p class="skills">${data.relevantSkills?.join(", ") || data.technologies}</p>
      </section>
    `,
    experience: isHidden("experience") ? "" : `
      <section class="section">
        ${getSectionTitle("experience", "Experience") ? `<h2>${getSectionTitle("experience", "Experience")}</h2>` : ""}
        ${data.experiences.map(exp => `
          <div class="experience">
            <div class="exp-header">
              <strong>${exp.title}, ${exp.company}</strong>
              <span>${exp.start} - ${exp.end}</span>
            </div>
            <div>${exp.location}</div>
            <ul>${exp.bullets.map(b => `<li>${b}</li>`).join("")}</ul>
          </div>
        `).join("")}
      </section>
    `,
    education: isHidden("education") ? "" : `
      <section class="section">
        ${getSectionTitle("education", "Education") ? `<h2>${getSectionTitle("education", "Education")}</h2>` : ""}
        ${data.education.map(edu => `
          <div class="education">
            <strong>${edu.degree} in ${edu.field}</strong>, ${edu.school} (${edu.startDate} - ${edu.endDate})
          </div>
        `).join("")}
      </section>
    `
  };

  const orderedSections = (settings.sectionOrder || defaultSettings.sectionOrder)
    .filter(key => !isHidden(key))
    .map(key => sections[key] || "")
    .join("");
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: ${font};
          font-size: ${sizes.body};
          line-height: 1.6;
          color: #000;
          padding: 48px 60px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        h1 {
          font-size: ${sizes.title};
          font-weight: bold;
          margin-bottom: 6px;
        }
        .contact {
          font-size: ${sizes.small};
        }
        .section {
          margin-bottom: 16px;
        }
        h2 {
          font-size: ${sizes.heading};
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          margin-bottom: 8px;
          padding-bottom: 2px;
        }
        .experience, .education {
          margin-bottom: 12px;
        }
        .exp-header {
          display: flex;
          justify-content: space-between;
        }
        ul {
          padding-left: 24px;
          margin-top: 4px;
        }
        li { margin-bottom: 2px; }
        .skills { font-size: ${sizes.small}; }
      </style>
    </head>
    <body>
      <header class="header">
        <h1>${data.profile.firstName} ${data.profile.lastName}</h1>
        <div class="contact">${data.profile.email} | ${data.profile.phone} | ${data.profile.location}</div>
      </header>
      ${orderedSections}
    </body>
    </html>
  `;
}

function generateMinimalHTML(data: ResumeData, settings: ResumeSettings): string {
  const color = settings.primaryColor || "#374151";
  const sizes = fontSizeMap[settings.fontSize] || fontSizeMap.medium;
  const prefs = { ...defaultSectionPreferences, ...settings.sectionPreferences };
  
  const getSectionTitle = (key: string, defaultTitle: string) => {
    const pref = prefs[key];
    if (!pref) return defaultTitle;
    return pref.title !== undefined ? pref.title : defaultTitle;
  };
  
  const isHidden = (key: string) => prefs[key]?.hidden === true;
  
  const sections: Record<string, string> = {
    summary: isHidden("summary") ? "" : `
      <section class="section">
        ${getSectionTitle("summary", "") ? `<h2>${getSectionTitle("summary", "")}</h2>` : ""}
        <ul style="list-style:none;padding:0">${data.logline.map(l => `<li>• ${l}</li>`).join("")}</ul>
      </section>
    `,
    skills: isHidden("skills") ? "" : `
      <section class="section">
        ${getSectionTitle("skills", "Skills") ? `<h2>${getSectionTitle("skills", "Skills")}</h2>` : ""}
        <p class="skills">${data.relevantSkills?.join(" · ") || data.technologies}</p>
      </section>
    `,
    experience: isHidden("experience") ? "" : `
      <section class="section">
        ${getSectionTitle("experience", "Experience") ? `<h2>${getSectionTitle("experience", "Experience")}</h2>` : ""}
        ${data.experiences.map(exp => `
          <div class="experience">
            <div class="exp-title">${exp.title} at ${exp.company}</div>
            <div class="exp-meta">${exp.location} | ${exp.start} - ${exp.end}</div>
            <ul>${exp.bullets.map(b => `<li>${b}</li>`).join("")}</ul>
          </div>
        `).join("")}
      </section>
    `,
    education: isHidden("education") ? "" : `
      <section class="section">
        ${getSectionTitle("education", "Education") ? `<h2>${getSectionTitle("education", "Education")}</h2>` : ""}
        ${data.education.map(edu => `<div>${edu.degree} in ${edu.field}, ${edu.school}</div>`).join("")}
      </section>
    `
  };

  const orderedSections = (settings.sectionOrder || defaultSettings.sectionOrder)
    .filter(key => !isHidden(key))
    .map(key => sections[key] || "")
    .join("");
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', sans-serif;
          font-size: ${sizes.body};
          line-height: 1.5;
          color: #374151;
          padding: 40px;
        }
        .header { margin-bottom: 24px; }
        h1 {
          font-size: ${sizes.title};
          font-weight: 600;
          color: ${color};
        }
        .contact {
          font-size: ${sizes.small};
          color: #6b7280;
          margin-top: 4px;
        }
        .section { margin-bottom: 18px; }
        h2 {
          font-size: ${sizes.heading};
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: ${color};
          margin-bottom: 8px;
        }
        .experience { margin-bottom: 12px; }
        .exp-title { font-weight: 500; }
        .exp-meta { font-size: ${sizes.small}; color: #9ca3af; }
        ul { padding-left: 16px; margin-top: 4px; }
        li { margin-bottom: 2px; font-size: ${sizes.body}; }
        .skills { font-size: ${sizes.small}; color: #6b7280; }
      </style>
    </head>
    <body>
      <header class="header">
        <h1>${data.profile.firstName} ${data.profile.lastName}</h1>
        <div class="contact">${data.profile.email} · ${data.profile.phone} · ${data.profile.location}</div>
      </header>
      ${orderedSections}
    </body>
    </html>
  `;
}

function generateCreativeHTML(data: ResumeData, settings: ResumeSettings): string {
  const color = settings.primaryColor || "#7c3aed";
  const sizes = fontSizeMap[settings.fontSize] || fontSizeMap.medium;
  const prefs = { ...defaultSectionPreferences, ...settings.sectionPreferences };
  
  const getSectionTitle = (key: string, defaultTitle: string) => {
    const pref = prefs[key];
    if (!pref) return defaultTitle;
    return pref.title !== undefined ? pref.title : defaultTitle;
  };
  
  const isHidden = (key: string) => prefs[key]?.hidden === true;
  
  const mainSections: Record<string, string> = {
    summary: isHidden("summary") ? "" : `
      <section class="section">
        ${getSectionTitle("summary", "") ? `<h2>${getSectionTitle("summary", "")}</h2>` : ""}
        <ul style="list-style:none;padding:0">${data.logline.map(l => `<li>▹ ${l}</li>`).join("")}</ul>
      </section>
    `,
    experience: isHidden("experience") ? "" : `
      <section class="section">
        ${getSectionTitle("experience", "Experience") ? `<h2>${getSectionTitle("experience", "Experience")}</h2>` : ""}
        ${data.experiences.map(exp => `
          <div class="experience">
            <div class="exp-header">
              <span class="exp-title">${exp.title}</span>
              <span class="exp-dates">${exp.start} - ${exp.end}</span>
            </div>
            <div class="exp-company">${exp.company} · ${exp.location}</div>
            <ul>${exp.bullets.map(b => `<li>${b}</li>`).join("")}</ul>
          </div>
        `).join("")}
      </section>
    `,
    skills: isHidden("skills") ? "" : `
      <section class="section main-skills">
        ${getSectionTitle("skills", "Technical Skills") ? `<h2>${getSectionTitle("skills", "Technical Skills")}</h2>` : ""}
        <p>${data.relevantSkills?.join(" • ") || data.technologies}</p>
      </section>
    `,
    education: isHidden("education") ? "" : `
      <section class="section">
        ${getSectionTitle("education", "Education") ? `<h2>${getSectionTitle("education", "Education")}</h2>` : ""}
        ${data.education.map(edu => `
          <div class="edu-item">
            <strong>${edu.degree} in ${edu.field}</strong>
            <div class="edu-school">${edu.school} (${edu.startDate} - ${edu.endDate})</div>
          </div>
        `).join("")}
      </section>
    `
  };

  const orderedMainSections = (settings.sectionOrder || defaultSettings.sectionOrder)
    .filter(key => !isHidden(key))
    .map(key => mainSections[key] || "")
    .join("");
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Poppins', sans-serif;
          font-size: ${sizes.body};
          line-height: 1.6;
          color: #1f2937;
          display: flex;
        }
        .sidebar {
          width: 200px;
          background: ${color};
          color: white;
          padding: 30px 20px;
          min-height: 100vh;
        }
        .main {
          flex: 1;
          padding: 30px 40px;
        }
        .sidebar h1 {
          font-size: ${sizes.title};
          font-weight: 700;
          margin-bottom: 6px;
        }
        .sidebar .contact {
          font-size: ${sizes.small};
          opacity: 0.9;
          margin-bottom: 20px;
        }
        .sidebar h3 {
          font-size: ${sizes.small};
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
          margin-top: 16px;
        }
        .sidebar .skills-list {
          font-size: ${sizes.small};
          opacity: 0.9;
        }
        .main h2 {
          font-size: ${sizes.heading};
          font-weight: 600;
          color: ${color};
          margin-bottom: 12px;
          padding-bottom: 4px;
          border-bottom: 2px solid ${color};
        }
        .section { margin-bottom: 20px; }
        .experience { margin-bottom: 14px; }
        .exp-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .exp-title { font-weight: 600; }
        .exp-dates { font-size: ${sizes.small}; color: #9ca3af; }
        .exp-company { color: #6b7280; font-size: ${sizes.small}; }
        .edu-school { color: #6b7280; font-size: ${sizes.small}; }
        .edu-item { margin-bottom: 8px; }
        .main-skills p { font-size: ${sizes.small}; color: #4b5563; }
        ul { padding-left: 18px; margin-top: 6px; }
        li { margin-bottom: 3px; font-size: ${sizes.body}; }
      </style>
    </head>
    <body>
      <aside class="sidebar">
        <h1>${data.profile.firstName}<br>${data.profile.lastName}</h1>
        <div class="contact">
          ${data.profile.email}<br>
          ${data.profile.phone}<br>
          ${data.profile.location}
        </div>
        <h3>Quick Skills</h3>
        <div class="skills-list">${data.relevantSkills?.slice(0, 8).join("<br>") || data.technologies.split(",").slice(0, 8).join("<br>")}</div>
      </aside>
      <main class="main">
        ${orderedMainSections}
      </main>
    </body>
    </html>
  `;
}

export function generateResumeHTML(data: ResumeData, settings: Partial<ResumeSettings> = {}): string {
  const mergedSettings = { ...defaultSettings, ...settings };
  
  switch (mergedSettings.template) {
    case "classic":
      return generateClassicHTML(data, mergedSettings);
    case "minimal":
      return generateMinimalHTML(data, mergedSettings);
    case "creative":
      return generateCreativeHTML(data, mergedSettings);
    default:
      return generateModernHTML(data, mergedSettings);
  }
}

export async function generateResumePDF(data: ResumeData, settings: Partial<ResumeSettings> = {}): Promise<Buffer> {
  const html = generateResumeHTML(data, settings);
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  
  const pdf = await page.pdf({
    format: "Letter",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" }
  });
  
  await browser.close();
  return Buffer.from(pdf);
}

export async function generateResumeDOCX(data: ResumeData, settings: Partial<ResumeSettings> = {}): Promise<Buffer> {
  const mergedSettings = { ...defaultSettings, ...settings };
  
  const children: Paragraph[] = [];
  
  children.push(
    new Paragraph({
      text: `${data.profile.firstName} ${data.profile.lastName}`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `${data.profile.email} | ${data.profile.phone} | ${data.profile.location}`,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: "" })
  );
  
  const sectionGenerators: Record<string, () => Paragraph[]> = {
    summary: () => {
      const paras: Paragraph[] = [];
      paras.push(
        new Paragraph({
          text: "PROFESSIONAL SUMMARY",
          heading: HeadingLevel.HEADING_1,
          border: { bottom: { style: BorderStyle.SINGLE, size: 1 } }
        })
      );
      data.logline.forEach(line => {
        paras.push(new Paragraph({
          children: [new TextRun({ text: `• ${line}` })]
        }));
      });
      paras.push(new Paragraph({ text: "" }));
      return paras;
    },
    skills: () => {
      return [
        new Paragraph({
          text: "SKILLS",
          heading: HeadingLevel.HEADING_1,
          border: { bottom: { style: BorderStyle.SINGLE, size: 1 } }
        }),
        new Paragraph({
          text: data.relevantSkills?.join(", ") || data.technologies
        }),
        new Paragraph({ text: "" })
      ];
    },
    experience: () => {
      const paras: Paragraph[] = [];
      paras.push(
        new Paragraph({
          text: "EXPERIENCE",
          heading: HeadingLevel.HEADING_1,
          border: { bottom: { style: BorderStyle.SINGLE, size: 1 } }
        })
      );
      data.experiences.forEach(exp => {
        paras.push(
          new Paragraph({
            children: [
              new TextRun({ text: exp.title, bold: true }),
              new TextRun({ text: ` | ${exp.company}` }),
              new TextRun({ text: ` | ${exp.start} - ${exp.end}`, italics: true })
            ]
          }),
          new Paragraph({ text: exp.location, spacing: { after: 100 } })
        );
        exp.bullets.forEach(bullet => {
          paras.push(new Paragraph({
            children: [new TextRun({ text: `• ${bullet}` })]
          }));
        });
        paras.push(new Paragraph({ text: "" }));
      });
      return paras;
    },
    education: () => {
      const paras: Paragraph[] = [];
      paras.push(
        new Paragraph({
          text: "EDUCATION",
          heading: HeadingLevel.HEADING_1,
          border: { bottom: { style: BorderStyle.SINGLE, size: 1 } }
        })
      );
      data.education.forEach(edu => {
        paras.push(new Paragraph({
          children: [
            new TextRun({ text: `${edu.degree} in ${edu.field}`, bold: true }),
            new TextRun({ text: ` - ${edu.school}` }),
            new TextRun({ text: ` (${edu.startDate} - ${edu.endDate})`, italics: true })
          ]
        }));
      });
      paras.push(new Paragraph({ text: "" }));
      return paras;
    }
  };
  
  const sectionOrder = mergedSettings.sectionOrder || defaultSettings.sectionOrder;
  sectionOrder.forEach(section => {
    const generator = sectionGenerators[section];
    if (generator) {
      children.push(...generator());
    }
  });

  const doc = new Document({
    sections: [{ children }]
  });

  return await Packer.toBuffer(doc);
}

export const resumeTemplates = [
  { id: "modern", name: "Modern", description: "Clean and contemporary with accent colors" },
  { id: "classic", name: "Classic", description: "Traditional serif font layout" },
  { id: "minimal", name: "Minimal", description: "Simple and understated design" },
  { id: "creative", name: "Creative", description: "Bold sidebar layout with visual flair" }
];

export const fontOptions = [
  { id: "Inter", name: "Inter", category: "sans-serif" },
  { id: "Roboto", name: "Roboto", category: "sans-serif" },
  { id: "Open Sans", name: "Open Sans", category: "sans-serif" },
  { id: "Lato", name: "Lato", category: "sans-serif" },
  { id: "Georgia", name: "Georgia", category: "serif" },
  { id: "Times New Roman", name: "Times New Roman", category: "serif" }
];

export const colorOptions = [
  { id: "#059669", name: "Green" },
  { id: "#1e3a5f", name: "Navy Blue" },
  { id: "#000000", name: "Black" },
  { id: "#6b7280", name: "Grey" },
  { id: "#78350f", name: "Brown" }
];

export const fontSizeOptions = [
  { id: "small", name: "Small", description: "Compact text for more content" },
  { id: "medium", name: "Medium", description: "Standard readable size" },
  { id: "large", name: "Large", description: "Larger text for emphasis" }
];
