const TIMESTAMP = /^(?:(\d{2,}):)?(\d{2}):(\d{2})[.,](\d{3})$/;
export const SAMPLE = '1\n00:00:01,000 --> 00:00:03,500\nA little clarity goes a long way.\n\n2\n00:00:04,000 --> 00:00:06,000\nMake every word accessible.\n';

export function parseTime(value, format = 'srt') {
  const match = value.match(TIMESTAMP);
  if (!match || (format === 'srt' && (!match[1] || !value.includes(','))) || (format === 'vtt' && !value.includes('.'))) throw new Error(`Invalid ${format.toUpperCase()} timestamp: ${value}`);
  const [, h = '0', m, s, ms] = match;
  if (+m > 59 || +s > 59) throw new Error(`Minutes and seconds must be below 60: ${value}`);
  const time = ((+h * 60 + +m) * 60 + +s) * 1000 + +ms;
  if (!Number.isSafeInteger(time)) throw new Error('Timestamp is too large.');
  return time;
}

export function formatTime(time, format = 'srt') {
  const ms = Math.round(time);
  if (!Number.isSafeInteger(ms) || ms < 0) throw new Error('Subtitle time must be a nonnegative number.');
  const pad = (n, size = 2) => String(n).padStart(size, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}${format === 'srt' ? ',' : '.'}${pad(ms % 1000, 3)}`;
}

export function parseSubtitles(input) {
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!text) throw new Error('Add an SRT or VTT file, or paste subtitle text first.');
  if (text.length > 5 * 1024 * 1024) throw new Error('Use a subtitle file smaller than 5 MB.');
  const format = /^WEBVTT(?:[ \t]|\n|$)/.test(text) ? 'vtt' : 'srt';
  const blocks = text.split(/\n[ \t]*\n+/);
  const warnings = [];
  if (format === 'vtt') {
    const header = blocks.shift();
    if (header.includes('-->')) throw new Error('Add a blank line after the WEBVTT header.');
    if (header.split('\n').length > 1) warnings.push('WebVTT header metadata is omitted in exports.');
  }
  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    if (format === 'vtt' && /^(NOTE(?:[ \t]|$)|STYLE$|REGION$)/.test(lines[0])) {
      warnings.push('WebVTT comments, styles and region definitions are omitted in exports.'); continue;
    }
    const timingIndex = lines[0].includes('-->') ? 0 : 1;
    if (timingIndex === 1 && (format === 'srt' ? !/^\d+$/.test(lines[0].trim()) : lines[0].includes('-->'))) throw new Error(`Invalid cue identifier near block ${cues.length + 1}.`);
    const timing = lines[timingIndex]?.match(/^(\S+)\s+-->\s+(\S+)(?:[ \t]+(.*))?$/);
    if (!timing) throw new Error(`Missing or invalid timing near cue ${cues.length + 1}. Include blank lines between cues.`);
    const start = parseTime(timing[1], format);
    const end = parseTime(timing[2], format);
    const payload = lines.slice(timingIndex + 1).join('\n');
    if (end <= start) throw new Error(`Cue ${cues.length + 1} must end after it starts.`);
    if (!payload.trim()) throw new Error(`Cue ${cues.length + 1} has no subtitle text.`);
    if (payload.includes('-->')) throw new Error(`Unexpected arrow in cue ${cues.length + 1}. Check for a missing blank line.`);
    if (timing[3]) warnings.push('Cue positioning settings are omitted in exports.');
    if (/<(?:c[. >]|v[ >]|lang[ >]|ruby[ >]|rt[ >]|\d{2}:)/i.test(payload)) warnings.push('WebVTT-specific text markup is removed in SRT exports; visual styling may change.');
    cues.push({ start, end, text: payload });
  }
  if (!cues.length) throw new Error('No subtitle cues found.');
  return { format, cues, warnings: [...new Set(warnings)] };
}

const basicText = (text) => text.replace(/<\/?(?:c(?:\.[\w.-]+)?|v|lang|ruby|rt)(?:\s[^>]*)?>/gi, '').replace(/<\d{2,}:\d{2}:\d{2}\.\d{3}>/g, '').replace(/<\d{2}:\d{2}\.\d{3}>/g, '');
export function plainText(text) {
  return text.replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|nbsp|quot|apos);/g, (s) => ({'&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ', '&quot;': '"', '&apos;': "'"}[s]));
}

export function exportSubtitles(cues, format = 'srt') {
  if (!['srt', 'vtt', 'txt'].includes(format)) throw new Error('Unsupported output format.');
  if (format === 'txt') return cues.map((cue) => plainText(cue.text)).join('\n\n') + '\n';
  const body = cues.map((cue, index) => `${format === 'srt' ? `${index + 1}\n` : ''}${formatTime(cue.start, format)} --> ${formatTime(cue.end, format)}\n${format === 'srt' ? basicText(cue.text) : cue.text}`).join('\n\n');
  return `${format === 'vtt' ? 'WEBVTT\n\n' : ''}${body}\n`;
}

export function shiftSubtitles(cues, seconds) {
  if (!Number.isFinite(seconds) || Math.abs(seconds) > 86400) throw new Error('Enter an offset between -86400 and 86400 seconds.');
  const offset = Math.round(seconds * 1000);
  if (cues.some((cue) => cue.start + offset < 0)) throw new Error('This offset moves a cue before 00:00:00. Choose a smaller negative offset.');
  return cues.map((cue) => ({...cue, start: cue.start + offset, end: cue.end + offset}));
}

export function inspectSubtitles(cues) {
  const issues = [];
  let latestEnd = -1;
  cues.forEach((cue, i) => {
    if (i && cue.start < cues[i - 1].start) issues.push(`Cue ${i + 1}: starts before the previous cue (out of order).`);
    if (cue.start < latestEnd) issues.push(`Cue ${i + 1}: overlaps an earlier cue. This may be intentional.`);
    const text = plainText(cue.text);
    if (text.split('\n').some((line) => [...line].length > 42)) issues.push(`Cue ${i + 1}: a line exceeds 42 characters (review readability).`);
    const cps = [...text.replace(/\s/g, '')].length / ((cue.end - cue.start) / 1000);
    if (cps > 20) issues.push(`Cue ${i + 1}: ${cps.toFixed(1)} characters/second (review reading speed).`);
    latestEnd = Math.max(latestEnd, cue.end);
  });
  return issues;
}

export function analyzeCues(cues, {maxCps = 20, maxLine = 42} = {}) {
  if (!Number.isFinite(maxCps) || maxCps < 1 || maxCps > 100 || !Number.isInteger(maxLine) || maxLine < 10 || maxLine > 120) throw new Error('Use a reading speed from 1 to 100 and a line length from 10 to 120.');
  let latestEnd = -1;
  return cues.map((cue, index) => {
    const text = plainText(cue.text);
    const duration = (cue.end - cue.start) / 1000;
    const cps = [...text.replace(/\s/g, '')].length / duration;
    const longestLine = Math.max(...text.split('\n').map((line) => [...line].length));
    const issues = [];
    if (index && cue.start < cues[index - 1].start) issues.push('Out of order');
    if (cue.start < latestEnd) issues.push('Overlap');
    if (longestLine > maxLine) issues.push('Long line');
    if (cps > maxCps) issues.push('Fast reading');
    latestEnd = Math.max(latestEnd, cue.end);
    return {index, duration, cps, longestLine, issues};
  });
}

export function synchronizeSubtitles(cues, {sourceA, targetA, sourceB, targetB}) {
  const points = [sourceA, targetA, sourceB, targetB];
  if (points.some((n) => !Number.isFinite(n) || n < 0) || sourceB <= sourceA || targetB <= targetA) throw new Error('Enter two increasing source times and two increasing video times, in seconds.');
  const scale = (targetB - targetA) / (sourceB - sourceA);
  if (scale < 0.5 || scale > 2) throw new Error('The timing scale must be between 0.5× and 2×. Check your anchor points.');
  const map = (ms) => Math.round((targetA + (ms / 1000 - sourceA) * scale) * 1000);
  const result = cues.map((cue) => ({...cue, start:map(cue.start), end:map(cue.end)}));
  if (result.some((cue) => cue.start < 0 || cue.end <= cue.start || !Number.isSafeInteger(cue.end))) throw new Error('These anchors create a negative or invalid cue time. Adjust the anchors; no cues were changed.');
  return {cues:result, scale, offset:targetA - sourceA * scale};
}

export function suggestLineBreak(text) {
  if (/<[^>]*>/.test(text)) throw new Error('Line suggestions support plain text. Edit formatted captions manually to keep their tags.');
  if (/^\s*[-–—]/m.test(text)) throw new Error('Keep dialogue line breaks intact; edit this cue manually.');
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return text;
  let best = text;
  let score = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(' '), right = words.slice(i).join(' ');
    const candidate = Math.abs([...left].length - [...right].length) - (/[,.!?;:]$/.test(left) ? 4 : 0);
    if (candidate < score) {score = candidate; best = `${left}\n${right}`;}
  }
  return best;
}
