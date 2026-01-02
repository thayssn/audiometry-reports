export const splitLines = (content: string) => content.split("\n");

export const formatToHTML = (content: string): string => {
  const tags = splitLines(content).map(renderHTMLLine).join("\n");
  return cleanTags(tags);
};

const cleanTags = (content: string) => {
  let finalContent = content;
  const code = content.match(/<pre>(.*?)<\/pre>/gs) ?? [];
  if (code?.length) {
    code.forEach((c) => {
      finalContent = finalContent.replace(
        c,
        c.replace(/<p>/gs, "").replace(/<\/p>/gs, "").replace(/<br>/gs, "")
      );
    });
  }

  return finalContent.replace(/<p><\/p>/gs, " ");
};

export const cleanMultiline = (content: string) => {
  return content.replaceAll(/\n{2,}/gs, "\n");
};

export const renderCode = (content: string): string => {
  let newContent = content;
  const codeMatches = content.match(/```(.*?)```/gs);
  if (!codeMatches?.length) return newContent;
  codeMatches.forEach((match) => {
    const [, language, code] = match.match(/```(.*?)\n(.*?)```/s) ?? [];
    newContent = newContent.replace(
      match,
      `<h6>${language}</h6>
      <pre><code>${code}</code></pre>`
    );
  });
  return newContent;
};

export const renderCSV = (content: string): string => {
  const csvMatches = content.match(/--table\n(.*?)\n--tableend/gs);
  if (!csvMatches) return content;

  let newContent = content;
  csvMatches.forEach((match) => {
    const lines = splitLines(match.split("\n").slice(1, -1).join("\n"));
    const cells = lines.map((line, index) => {
      const isHeader = index === 0;
      return `${isHeader ? "<thead>" : "<tr>"}${line
        .split(" || ")
        .map((cell) => `<td>${cell.trim()}</td>`)
        .join("")}${isHeader ? "</thead>" : "</tr>"}`;
    });
    newContent = newContent.replace(match, `<table>${cells.join("")}</table>`);
  });
  return newContent;
};

export const renderHTMLLine = (line: string): string => {
  if (line === "\n") return "<br>";

  if (line === "--") return "<br>";

  if (line.startsWith("# ")) {
    return `\n<h1>${line.replace("# ", "")}</h1>`;
  }
  if (line.startsWith("## ")) {
    return `\n<h2>${line.replace("## ", "")}</h2>`;
  }
  if (line.startsWith("### ")) {
    return `\n<h3>${line.replace("### ", "")}</h3>`;
  }
  if (line.startsWith("#### ")) {
    return `\n<h4>${line.replace("#### ", "")}</h4>`;
  }
  if (line.startsWith("##### ")) {
    return `\n<h5>${line.replace("##### ", "")}</h5>`;
  }
  if (line.startsWith("###### ")) {
    return `\n<h6>${line.replace("###### ", "")}</h6>`;
  }

  let formattedLine = line;
  formattedLine = formattedLine.replace(
    /\*\*(.*?)\*\*/g,
    '<span class="bold">$1</span>'
  );

  formattedLine = formattedLine.replace(/- (.*?);/g, "<li>$1</li>");

  formattedLine = formattedLine.replace(
    /\__(.*?)\__/g,
    '<span class="underline">$1</span>'
  );

  formattedLine = formattedLine.replace(/\`(.*?)\`/g, "<code>$1</code>");

  formattedLine = formattedLine.replace(
    /\*(.*?)\*/g,
    '<span class="italic">$1</span>'
  );

  return `\n<p>${formattedLine}</p>`;
};

export const getPrintableContent = (content: string): string => {
  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");

  return `
      <html>
        <head>
          <style>${styles}</style>
        </head>
        <body>
          <div id="printable-area" class="print-page">
            ${content}
          </div>
        </body>
      </html>
    `;
};
