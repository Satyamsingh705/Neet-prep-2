import { type ReactNode } from "react";
import type { QuestionTable } from "@/lib/types";
import katex from "katex";
import "katex/dist/katex.min.css";

type QuestionContentProps = {
  prompt: string | null;
  table?: QuestionTable | null;
  promptClassName?: string;
  tableClassName?: string;
};

function isSuperscriptCharacter(value: string) {
  return /[A-Za-z0-9+-]/.test(value);
}

export function renderQuestionText(text: string): ReactNode {
  // 1. Extract all math blocks to avoid messing them up with the ^ parser or HTML escaping.
  const latexRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[\s\S]*?\$)/g;
  
  const blocks: { type: 'text' | 'math', content: string, displayMode?: boolean }[] = [];
  let lastIndex = 0;
  
  text.replace(latexRegex, (match, p1, offset) => {
    if (offset > lastIndex) {
      blocks.push({ type: 'text', content: text.slice(lastIndex, offset) });
    }
    
    let math = match;
    let displayMode = false;

    if (math.startsWith('$$') && math.endsWith('$$')) {
      math = math.slice(2, -2);
      displayMode = true;
    } else if (math.startsWith('\\[') && math.endsWith('\\]')) {
      math = math.slice(2, -2);
      displayMode = true;
    } else if (math.startsWith('\\(') && math.endsWith('\\)')) {
      math = math.slice(2, -2);
      displayMode = false;
    } else if (math.startsWith('$') && math.endsWith('$')) {
      math = math.slice(1, -1);
      displayMode = false;
    }
    
    blocks.push({ type: 'math', content: math, displayMode });
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < text.length) {
    blocks.push({ type: 'text', content: text.slice(lastIndex) });
  }

  let finalHtml = "";

  // 2. If there are no math blocks at all, check for the raw LaTeX fallback ( Copilot prompt support )
  if (blocks.length === 1 && blocks[0].type === 'text') {
     let rawText = blocks[0].content;
     if (/\\int|\\frac|\\sqrt|\\sum|\\sin|\\cos|\\left|\\right/.test(rawText) && !/<[a-z][\s\S]*>/i.test(rawText)) {
        try {
          finalHtml = katex.renderToString(rawText, { displayMode: true, throwOnError: false, output: 'html' });
          return <span dangerouslySetInnerHTML={{ __html: finalHtml }} />;
        } catch(e) {}
     }
  }

  // 3. Process each block: KaTeX for math, ^ parser for text
  for (const block of blocks) {
    if (block.type === 'math') {
      try {
        finalHtml += katex.renderToString(block.content, {
          displayMode: block.displayMode,
          throwOnError: false,
          output: 'html'
        });
      } catch (e) {
        console.error("KaTeX rendering error", e);
        finalHtml += block.content; // fallback
      }
    } else {
      // This is a text block. Run the custom ^ and _ parser ONLY on this text.
      let textContent = block.content;
      let processedText = "";
      let index = 0;
      
      while (index < textContent.length) {
        if (textContent[index] === "^") {
          let exponent = "";
          let nextIndex = index + 1;
          
          if (textContent[nextIndex] === "{") {
            const closingBraceIndex = textContent.indexOf("}", nextIndex + 1);
            if (closingBraceIndex !== -1) {
              exponent = textContent.slice(nextIndex + 1, closingBraceIndex);
              nextIndex = closingBraceIndex + 1;
            }
          } else {
            while (nextIndex < textContent.length && isSuperscriptCharacter(textContent[nextIndex])) {
              exponent += textContent[nextIndex];
              nextIndex += 1;
            }
          }
          
          if (exponent) {
            processedText += `<sup>${exponent}</sup>`;
            index = nextIndex;
            continue;
          }
        } else if (textContent[index] === "_") {
          let subscript = "";
          let nextIndex = index + 1;
          
          if (textContent[nextIndex] === "{") {
            const closingBraceIndex = textContent.indexOf("}", nextIndex + 1);
            if (closingBraceIndex !== -1) {
              subscript = textContent.slice(nextIndex + 1, closingBraceIndex);
              nextIndex = closingBraceIndex + 1;
            }
          } else {
            while (nextIndex < textContent.length && isSuperscriptCharacter(textContent[nextIndex])) {
              subscript += textContent[nextIndex];
              nextIndex += 1;
            }
          }
          
          if (subscript) {
            processedText += `<sub>${subscript}</sub>`;
            index = nextIndex;
            continue;
          }
        }
        processedText += textContent[index];
        index += 1;
      }
      finalHtml += processedText;
    }
  }

  return <span dangerouslySetInnerHTML={{ __html: finalHtml }} />;
}

export function QuestionContent({ prompt, table, promptClassName, tableClassName }: QuestionContentProps) {
  return (
    <>
      {prompt ? <div className={promptClassName}>{renderQuestionText(prompt)}</div> : null}
      {table ? (
        <div className={tableClassName}>
          {table.caption ? <div className="mb-3 text-sm font-semibold text-black">{renderQuestionText(table.caption)}</div> : null}
          <div className="flex justify-center overflow-x-auto rounded-[0.9rem] border border-[#ddd0c3] bg-white">
            <table className="mx-auto min-w-full border-collapse text-left text-sm text-black sm:min-w-0">
              {table.headers && table.headers.length > 0 ? (
                <thead className="bg-[#0d14ff] text-white">
                  <tr>
                    {table.headers.map((header, index) => (
                      <th key={`header-${index}`} className="border border-[#98a1ff] px-4 py-3 text-center text-lg font-semibold">
                        {renderQuestionText(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`} className="bg-[#ffffff] even:bg-[#fbf8f3]">
                    {row.map((cell, cellIndex) => (
                      <td key={`cell-${rowIndex}-${cellIndex}`} className="border border-[#ddd0c3] px-4 py-3 align-top whitespace-pre-line text-base">
                        {renderQuestionText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}