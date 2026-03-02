/**
 * DOCX and RTF parser: extracts text content and feeds it to the TXT parser pipeline.
 * Uses mammoth for DOCX; RTF is parsed by stripping control words.
 */
import mammoth from 'mammoth';

/**
 * Extract plain text from a DOCX ArrayBuffer.
 */
export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

/**
 * Extract plain text from an RTF string by stripping RTF control words.
 */
export function extractRtfText(rtfContent: string): string {
  // Remove RTF header/footer
  let text = rtfContent;

  // Remove RTF groups and control words
  text = text.replace(/\{\\[^{}]*\}/g, ''); // Remove nested groups like {\fonttbl...}
  text = text.replace(/\\[a-z]+\d*\s?/gi, ''); // Remove control words like \par, \b0
  text = text.replace(/\{|\}/g, ''); // Remove remaining braces
  text = text.replace(/\\'([0-9a-f]{2})/gi, (_, hex: string) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  text = text.replace(/\\u(\d+)\??/g, (_, code) => {
    return String.fromCharCode(parseInt(code));
  });
  text = text.replace(/\\\n/g, '\n');
  text = text.replace(/\\tab/g, '\t');
  text = text.replace(/\r\n/g, '\n');

  // Clean up excessive whitespace while preserving line breaks
  text = text.split('\n').map(l => l.trim()).join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}
