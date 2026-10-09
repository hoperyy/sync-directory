import { SAMPLE, parseSubtitles, exportSubtitles, shiftSubtitles, formatTime, plainText, analyzeCues, synchronizeSubtitles, suggestLineBreak } from './core.mjs?v=264cf3a457';
const $ = (id) => document.getElementById(id);
const input = $('source'), output = $('output'), video = $('video');
const mode = document.body.dataset.mode;
let filename = 'captions', currentOutput = '', currentExtension = 'vtt';
let cues = [], analysis = [], selected = 0, edits = [], videoUrl, loadRevision = 0;
const track = (event, parameters = {}) => window.siteAnalytics?.track(event, {tool_id:mode,...parameters});
const show = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
const numeric = (id) => $(id)?.value.trim() ? Number($(id).value) : NaN;
const thresholds = () => ({maxCps:$('max-cps') ? numeric('max-cps') : 20, maxLine:$('max-line') ? numeric('max-line') : 42});
function invalidate() {
  loadRevision++; currentOutput = ''; cues = []; analysis = []; edits = []; output.value = '';
  for (const id of ['download','copy','previous-cue','next-cue','playhead']) $(id).disabled = true;
  $('undo-cue') && ($('undo-cue').disabled = true);
  $('review').hidden = true; $('stats').textContent = 'Your result will appear here.';
  $('issues').replaceChildren(); $('cue-counter').textContent = 'No cues loaded';
  $('caption-preview').textContent = 'Every word deserves a little room.';
  show('Ready when you are.');
}
async function loadFile(file) {
  if (!file) return;
  invalidate(); const revision = loadRevision;
  if (file.size > 5 * 1024 * 1024) { show('Use a subtitle file smaller than 5 MB.', true); return; }
  if (!/\.(srt|vtt)$/i.test(file.name)) { show('Choose an .srt or .vtt file.', true); return; }
  try {
    const text = new TextDecoder('utf-8', {fatal:true}).decode(await file.arrayBuffer());
    if (revision !== loadRevision) return;
    input.value = text; filename = file.name.replace(/\.[^.]+$/, '');
    show(`Loaded ${file.name}. Run the tool to preview the captions.`);
  } catch { if (revision === loadRevision) show('This file is not valid UTF-8. Save it as UTF-8 in your text editor first.', true); }
}
function displayDetail(index) {
  selected = index;
  const cue = cues[index], info = analysis[index]; if (!cue || !info) return;
  $('cue-counter').textContent = `Cue ${index + 1} / ${cues.length}`;
  $('selected-time').textContent = `${formatTime(cue.start, 'vtt')} → ${formatTime(cue.end, 'vtt')}`;
  $('selected-metrics').textContent = `${info.duration.toFixed(2)} s · ${info.cps.toFixed(1)} chars/s · longest line ${info.longestLine} chars${info.issues.length ? ' · '+info.issues.join(' / ') : ' · within your thresholds'}`;
  if ($('cue-text')) $('cue-text').value = cue.text;
  if ($('selected-text')) $('selected-text').textContent = plainText(cue.text);
  $('previous-cue').disabled = index <= 0; $('next-cue').disabled = index >= cues.length - 1;
  for (const button of $('cue-list').querySelectorAll('button')) button.setAttribute('aria-pressed', String(Number(button.dataset.index) === index));
}
function renderCaption(seconds) {
  $('preview-time').textContent = formatTime(Math.max(0, seconds * 1000), 'vtt');
  const active = cues.filter((cue) => seconds * 1000 >= cue.start && seconds * 1000 < cue.end);
  $('caption-preview').textContent = active.map((cue) => plainText(cue.text)).join('\n') || (cues.length ? '—' : 'Every word deserves a little room.');
}
function seekCue(index) {
  if (!cues.length) return;
  index = Math.max(0, Math.min(cues.length-1, index)); displayDetail(index);
  const seconds = cues[index].start / 1000;
  $('playhead').value = String(seconds); renderCaption(seconds);
  if (videoUrl && video.readyState >= 1) { video.pause(); video.currentTime = Math.min(seconds, video.duration); }
}
function renderList() {
  const filtered = analysis.filter((item) => $('cue-filter').value !== 'issues' || item.issues.length);
  $('cue-list').replaceChildren();
  for (const item of filtered.slice(0, 200)) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'cue-row'; button.dataset.index = item.index;
    const number = document.createElement('span'); number.className = 'cue-number'; number.textContent = String(item.index+1).padStart(2,'0');
    const text = document.createElement('span'); text.className = 'cue-row-text'; text.textContent = plainText(cues[item.index].text).replace(/\s+/g,' ').slice(0,100);
    const badge = document.createElement('span'); badge.className = item.issues.length ? 'cue-badge flagged' : 'cue-badge'; badge.textContent = item.issues.join(' · ') || `${item.cps.toFixed(1)} cps`;
    button.append(number,text,badge); button.setAttribute('aria-pressed', String(item.index === selected)); button.addEventListener('click', () => seekCue(item.index));
    $('cue-list').append(button);
  }
  if (!filtered.length) {const p = document.createElement('p'); p.className = 'empty-cues'; p.textContent = 'No cues need review at these thresholds.'; $('cue-list').append(p);}
  $('cue-limit').textContent = filtered.length > 200 ? `Showing the first 200 of ${filtered.length} matching cues. Previous / next above the preview still visits every cue.` : `${filtered.length} ${$('cue-filter').value === 'issues' ? 'flagged' : 'total'} cues shown. Overlaps may be intentional; review the video.`;
}
function refreshOutput() {
  analysis = analyzeCues(cues, thresholds()); currentOutput = exportSubtitles(cues, currentExtension); output.value = currentOutput;
  const flagged = analysis.filter((item) => item.issues.length).length;
  $('stats').textContent = `${cues.length} cues · ${flagged} to review · ends ${formatTime(cues.reduce((end, cue) => Math.max(end, cue.end), 0), 'vtt')} · ${currentExtension.toUpperCase()} export`;
  $('review').hidden = false; $('download').disabled = false; $('copy').disabled = false;
  $('playhead').disabled = false; $('playhead').max = String(cues.reduce((end, cue) => Math.max(end, cue.end), 0)/1000);
  renderList(); seekCue(Math.min(selected, cues.length-1));
}
$('file').addEventListener('change', (e) => void loadFile(e.target.files[0]));
const drop = $('drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragging'); });
drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('dragging'); void loadFile(e.dataTransfer.files[0]); });
$('sample').addEventListener('click', () => {
  invalidate();
  const sample = mode === 'check' ? SAMPLE+'\n3\n00:00:05,800 --> 00:00:06,800\nSometimes a sentence needs a little more time to breathe.\n' : SAMPLE;
  input.value = mode === 'vtt-to-srt' ? exportSubtitles(parseSubtitles(sample).cues,'vtt') : sample;
  filename = 'sample'; show('Example loaded. Run the tool to explore it.');
});
$('clear').addEventListener('click', () => {input.value = ''; $('file').value = ''; filename = 'captions'; invalidate(); input.focus();});
input.addEventListener('input', invalidate);
for (const id of ['offset','format','source-a','source-b','target-a','target-b']) $(id)?.addEventListener('input', invalidate);
$('sync-mode')?.addEventListener('change', () => {$('anchor-controls').hidden = $('sync-mode').value !== 'anchors'; $('offset-controls').hidden = $('sync-mode').value !== 'offset'; invalidate();});
for(const id of ['max-cps','max-line']) $(id)?.addEventListener('input', () => {
  if (!cues.length) return;
  try {refreshOutput(); show('Review thresholds updated. Your captions have not been changed.');}
  catch(error) {show(error.message, true); $('download').disabled = true; $('copy').disabled = true;}
});
$('run').addEventListener('click', () => {
  invalidate(); selected = 0;
  try {
    const parsed = parseSubtitles(input.value);
    if (mode === 'srt-to-vtt' && parsed.format !== 'srt') throw new Error('This tool expects SRT input. Choose VTT to SRT for a VTT file.');
    if (mode === 'vtt-to-srt' && parsed.format !== 'vtt') throw new Error('This tool expects VTT input beginning with WEBVTT.');
    cues = parsed.cues; let timing = '';
    if (mode === 'shift') {
      if ($('sync-mode').value === 'anchors') {
        const sync = synchronizeSubtitles(cues, {sourceA:numeric('source-a'),targetA:numeric('target-a'),sourceB:numeric('source-b'),targetB:numeric('target-b')});
        cues = sync.cues; timing = ` Timing scale ${sync.scale.toFixed(5)}×, offset ${sync.offset.toFixed(3)} s. Cue durations also change.`;
      } else cues = shiftSubtitles(cues, numeric('offset'));
    }
    currentExtension = mode === 'srt-to-vtt' ? 'vtt' : mode === 'vtt-to-srt' ? 'srt' : mode === 'text' ? 'txt' : ($('format')?.value ?? parsed.format);
    refreshOutput();
    for (const warning of parsed.warnings) {const li = document.createElement('li'); li.textContent = warning; $('issues').append(li);}
    const flagged = analysis.filter((item) => item.issues.length).length;
    show(`Ready to review. ${flagged} cue${flagged === 1 ? '' : 's'} flagged by the reading/timing checks.${timing}`);
    track('tool_complete', {input_format:parsed.format,output_format:currentExtension});
  } catch(error) {cues = []; show(error.message, true);}
});
$('cue-filter').addEventListener('change', renderList);
$('previous-cue').addEventListener('click', () => seekCue(selected - 1));
$('next-cue').addEventListener('click', () => seekCue(selected + 1));
$('playhead').addEventListener('input', () => {
  const seconds = Number($('playhead').value); renderCaption(seconds);
  const index = cues.findIndex((cue) => seconds*1000 >= cue.start && seconds*1000 < cue.end); if (index >= 0 && index !== selected) displayDetail(index);
  if (videoUrl && video.readyState >= 1) {video.pause(); video.currentTime = Math.min(seconds, video.duration);}
});
$('suggest-break')?.addEventListener('click', () => {try {$('cue-text').value = suggestLineBreak($('cue-text').value); show('Line-break draft ready. Review it, then apply the text edit.');} catch(error) {show(error.message, true);}});
$('apply-cue')?.addEventListener('click', () => {
  try {
    const text = $('cue-text').value.trim();
    if (!text || /\n\s*\n|-->/.test(text)) throw new Error('Keep cue text nonempty, without blank lines or timing arrows.');
    analyzeCues(cues, thresholds());
    edits.push({index:selected, text:cues[selected].text}); if(edits.length > 50) edits.shift();
    cues[selected] = {...cues[selected], text}; refreshOutput(); $('undo-cue').disabled = false;
    show('Output text updated. Preview it against the video before exporting.');
  } catch(error) {show(error.message, true);}
});
$('undo-cue')?.addEventListener('click', () => {
  const previous = edits.pop(); if(!previous) return;
  cues[previous.index] = {...cues[previous.index], text:previous.text}; selected = previous.index; refreshOutput(); $('undo-cue').disabled = !edits.length; show('Last output text edit undone.');
});
function removeVideo() {video.pause(); video.removeAttribute('src'); video.load(); video.hidden = true; if(videoUrl) URL.revokeObjectURL(videoUrl); videoUrl = undefined; $('video-file').value = ''; $('remove-video').hidden = true; $('stage-label').hidden = false;}
$('video-file').addEventListener('change', (e) => {
  const file = e.target.files[0]; if(!file) return;
  removeVideo(); videoUrl = URL.createObjectURL(file); video.src = videoUrl; video.hidden = false; $('remove-video').hidden = false; $('stage-label').hidden = true;
  show('Local video opened. Your browser must support its video codec.');
});
$('remove-video').addEventListener('click', removeVideo);
video.addEventListener('error', () => {if(videoUrl) show('This browser could not play that video. Try an MP4 or WebM with a supported codec.', true);});
video.addEventListener('timeupdate', () => {if(cues.length) {$('playhead').value = String(video.currentTime); renderCaption(video.currentTime);}});
window.addEventListener('beforeunload', () => {if(videoUrl) URL.revokeObjectURL(videoUrl);});
$('download').addEventListener('click', () => {
  if(!currentOutput) return;
  const url = URL.createObjectURL(new Blob([currentOutput], {type:currentExtension === 'vtt' ? 'text/vtt;charset=utf-8' : 'text/plain;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = `${filename}-${mode}.${currentExtension}`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  track('tool_download', {output_format:currentExtension});
});
$('copy').addEventListener('click', async () => {
  try {await navigator.clipboard.writeText(currentOutput); show('Result copied to clipboard.'); track('tool_copy',{output_format:currentExtension});}
  catch {document.querySelector('.raw-result').open = true; output.focus(); output.select(); show('Clipboard access is unavailable. Copy the selected output manually.');}
});
