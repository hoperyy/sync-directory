import { SAMPLE, parseSubtitles, exportSubtitles, shiftSubtitles, inspectSubtitles, formatTime } from './core.mjs?v=febc8bba7f';
const $ = (id) => document.getElementById(id);
const input = $('source');
const output = $('output');
let filename = 'captions';
let currentOutput = '';
let currentExtension = 'vtt';
const mode = document.body.dataset.mode;
const track = (event, parameters = {}) => window.siteAnalytics?.track(event, {tool_id:mode,...parameters});
const show = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
function invalidate() {
  currentOutput = ''; output.value = ''; $('download').disabled = true; $('copy').disabled = true;
  $('stats').textContent = 'Your result will appear here.'; $('issues').replaceChildren();
  show('Ready when you are.');
}
async function loadFile(file) {
  if (!file) return;
  invalidate();
  if (file.size > 5 * 1024 * 1024) { show('Use a subtitle file smaller than 5 MB.', true); return; }
  if (!/\.(srt|vtt)$/i.test(file.name)) { show('Choose an .srt or .vtt file.', true); return; }
  try {
    input.value = new TextDecoder('utf-8', {fatal: true}).decode(await file.arrayBuffer());
    filename = file.name.replace(/\.[^.]+$/, '');
    show(`Loaded ${file.name}. Review the text, then run the tool.`);
  } catch { show('This file is not valid UTF-8. Save it as UTF-8 in your text editor first.', true); }
}
$('file').addEventListener('change', (e) => void loadFile(e.target.files[0]));
const drop = $('drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragging'); });
drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('dragging'); void loadFile(e.dataTransfer.files[0]); });
$('sample').addEventListener('click', () => { invalidate(); input.value = mode === 'vtt-to-srt' ? exportSubtitles(parseSubtitles(SAMPLE).cues, 'vtt') : SAMPLE; filename = 'sample'; show('Example loaded. Run the tool to try it.'); });
$('clear').addEventListener('click', () => { input.value = ''; $('file').value = ''; filename = 'captions'; invalidate(); input.focus(); });
input.addEventListener('input', invalidate);
for (const id of ['offset', 'format']) $(id)?.addEventListener('input', invalidate);
$('run').addEventListener('click', () => {
  invalidate();
  try {
    const parsed = parseSubtitles(input.value);
    if (mode === 'srt-to-vtt' && parsed.format !== 'srt') throw new Error('This tool expects SRT input. Use VTT to SRT for a VTT file.');
    if (mode === 'vtt-to-srt' && parsed.format !== 'vtt') throw new Error('This tool expects VTT input beginning with WEBVTT.');
    const cues = mode === 'shift' ? shiftSubtitles(parsed.cues, $('offset').value.trim() === '' ? NaN : Number($('offset').value)) : parsed.cues;
    currentExtension = mode === 'srt-to-vtt' ? 'vtt' : mode === 'vtt-to-srt' ? 'srt' : mode === 'text' ? 'txt' : ($('format')?.value ?? parsed.format);
    const issues = inspectSubtitles(cues);
    currentOutput = exportSubtitles(cues, currentExtension);
    output.value = currentOutput;
    $('stats').textContent = `${cues.length} cues · ${formatTime(cues.reduce((max, cue) => Math.max(max, cue.end), 0))} end time · ${parsed.format.toUpperCase()} → ${currentExtension.toUpperCase()}`;
    for (const message of [...parsed.warnings, ...(mode === 'check' ? issues : [])].slice(0, 100)) {
      const item = document.createElement('li'); item.textContent = message; $('issues').append(item);
    }
    if (issues.length > 100 && mode === 'check') { const item = document.createElement('li'); item.textContent = `${issues.length - 100} further readability/timing warnings omitted.`; $('issues').append(item); }
    show(mode === 'check' ? `Parsed successfully. ${issues.length} timing/readability warning${issues.length === 1 ? '' : 's'}. These checks do not certify platform compliance.` : 'Done. Preview your result before downloading.');
    $('download').disabled = false; $('copy').disabled = false;
    track('tool_complete', {input_format:parsed.format,output_format:currentExtension});
  } catch (error) { show(error.message, true); }
});
$('download').addEventListener('click', () => {
  if (!currentOutput) return;
  const url = URL.createObjectURL(new Blob([currentOutput], {type: currentExtension === 'vtt' ? 'text/vtt;charset=utf-8' : 'text/plain;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = `${filename}-${mode}.${currentExtension}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  track('tool_download', {output_format:currentExtension});
});
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(currentOutput); show('Result copied to clipboard.'); track('tool_copy', {output_format:currentExtension}); }
  catch { output.focus(); output.select(); show('Clipboard access is unavailable. The output is selected; copy it manually.'); }
});
