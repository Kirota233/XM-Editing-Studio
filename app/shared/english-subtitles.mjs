// English / Spanish require language markers or speaker-colon format; Chinese has a separate speaker-line mode.
import { normalizeSubtitlePunctuation } from './period-text.mjs';
import { extractChineseSubtitles } from './chinese-subtitles.mjs';

const marker = /^(?:\[(EN|ES(?:[-_](?:ES|MX|LA|419))?|ESP|SPA|SPANISH|ESPAÑOL|西语|西班牙语)\]|【(EN|ES|ESP|SPA|SPANISH|ESPAÑOL|西语|西班牙语)】|\[(EN|ES|ESP|SPA)\s+|(?:西语|西班牙语|Español|Spanish)\s*[:：])/i;
const direction = /^(?:[△▲]|(?:VO|V\.O\.|OS|O\.S\.|SFX|ACTION|SCENE|NOTE|INT\.|EXT\.)\s*[:：])/i;
const titleOrEp = /^(?:第\s*[0-9零〇一二两三四五六七八九十百千]+\s*[集话回]|(?:EP(?:ISODE)?\.?\s*\d+)|\d+[-－]\d+(?=[\s,，:：]))/i;
const reservedSpeakers = /^(?:人物|角色|场景|地点|时间|画面|字幕|音效|配乐|备注|说明|旁白说明|CAST|CHARACTERS?|LOCATION|TIME|TITLE|EPISODE|SCENE|ACTION|NOTE|SFX|MUSIC|BGM|INT\.?|EXT\.?|English|Spanish|https?)$/i;

const tt = /\b(?:Mr|Mrs|Ms|Mx|Dr|Prof|Sr|Jr)\.$/i;
const rt = /\b(?:Sr|Sra|Srta|Dr|Dra|Ud|Uds|Prof|Profa)\.$/i;

function cleanUnmarkedSpeakerLine(line) {
  if (direction.test(line) || /^[\[【△▲Δ]/.test(line)) return null;
  let depth = 0, colonIdx = -1;
  for (let i = 0; i < line.length; i++) {
    if ('(（[【'.includes(line[i])) depth++;
    else if (')）]】'.includes(line[i])) depth = Math.max(0, depth - 1);
    else if (!depth && /[:：]/.test(line[i])) { colonIdx = i; break; }
  }
  if (colonIdx < 1 || (/\d/.test(line[colonIdx - 1] || '') && /\d/.test(line[colonIdx + 1] || '')) || line.slice(colonIdx + 1, colonIdx + 3) === '//') return null;
  let speaker = line.slice(0, colonIdx).replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]|【[^】]*】/g, '').trim();
  if (speaker.length > 70 || reservedSpeakers.test(speaker) || !/\p{L}/u.test(speaker) || !/^[\p{L}\p{M}\p{N}\s.'’·/_—–-]+$/u.test(speaker)) return null;
  let content = line.slice(colonIdx + 1).split(/[△▲Δ]/, 1)[0].trim();
  let stripped = content.replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]|【[^】]*】/g, '');
  if (!/\p{Script=Latin}/u.test(stripped) || /\p{Script=Han}/u.test(stripped)) return null;
  return content;
}

function detectSpanishOrEnglish(text, fallback = 'en') {
  if (/[¿¡ñÑ]/.test(text) || /\b(?:hola|gracias|señor|señora|estoy|estás|está|dónde|qué|cómo|quiero|puedes|usted|ustedes|nosotros|ahora|aquí|espera|pero|porque|tengo|tienes|vamos|eres|esto|eso)\b/iu.test(text)) return 'es';
  if (/\b(?:the|your|you|are|was|were|with|why|what|please|hello|thanks|don't|can't|isn't|it's|i'm)\b/i.test(text)) return 'en';
  return fallback;
}

function dialogueAfterSpeaker(text) {
  let annotationDepth = 0;
  for (let at = 0; at < text.length; at++) {
    if ('(（[【'.includes(text[at])) annotationDepth++;
    else if (')）]】'.includes(text[at])) annotationDepth = Math.max(0, annotationDepth - 1);
    else if (!annotationDepth && /[:：]/.test(text[at])) {
      if (/\d/.test(text[at - 1] || '') && /\d/.test(text[at + 1] || '') || text.slice(at + 1, at + 3) === '//') return text;
      return text.slice(at + 1).trimStart();
    }
  }
  return text;
}

export function normalizeEnglish(text, language = 'en') {
  return normalizeSubtitlePunctuation(text.replace(/[\p{Script=Han}]+[，、。！？；：,.!?;:]*/gu, ' ')).normalize('NFKC')
    .replace(/\[[^\]]*\]|【[^】]*】|\([^)]*\)/g, ' ')
    .replace(/[\p{Script=Han}]+/gu, ' ')
    .replace(/[“”„]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[，、]/g, ',').replace(/[。…]/g, '.')
    .replace(/！/g, '!').replace(/？/g, '?').replace(/：/g, ':').replace(/；/g, ';')
    .replace(/[—–]/g, ' - ').replace(/\.(?:\s*\.)+/g, '...')
    .replace(language === 'es' ? /\b(Mr|Mrs|Ms)\.(?=\s+\p{L})/gu : /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr)\.(?=\s+\p{Script=Latin})/gu, '$1')
    .replace(/\b(?:V\.?O\.?|O\.?S\.?)\s*:\s*/gi, '')
    .replace(language === 'es' ? /[^\p{Script=Latin}\p{M}\x20-\x7E¿¡\n]/gu : /[^\p{Script=Latin}\p{M}\x20-\x7E\n]/gu, ' ').replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\.{2,}/g, '...').replace(/[!?]+/g, run => run[0])
    .replace(/^[;:\s-]+|[;:\s-]+$/g, '').trim();
}

function sentenceParts(text, language) {
  const result = []; let start = 0;
  for (let at = 0; at < text.length; at++) {
    if (!/[.!?]/.test(text[at])) continue;
    if (text[at] === '.' && (/\d/.test(text[at - 1] || '') && /\d/.test(text[at + 1] || '') || /\b(?:St|vs|etc|[A-Z])\.$/.test(text.slice(0, at + 1)))) continue;
    if (language === 'es' && text[at] === '.' && /\b(?:Sr|Sra|Srta|Dr|Dra|Ud|Uds|Srta|Prof|Profa|etc)\.$/i.test(text.slice(0, at + 1))) continue;
    let end = at + 1;
    while (/["')]/.test(text[end] || '') && end < text.length) end++;
    if (end < text.length && !/\s/.test(text[end])) continue;
    if (!/\p{Script=Latin}/u.test(text.slice(start, end))) continue;
    result.push(text.slice(start, end).trim()); start = end; at = end - 1;
  }
  if (text.slice(start).trim()) result.push(text.slice(start).trim());
  return result;
}

export function rhythmLines(text, language = 'en') {
  const lines = [];
  for (let sentence of sentenceParts(normalizeEnglish(text, language), language)) {
    while (sentence.length > 76) {
      const candidates = [];
      for (const match of sentence.matchAll(/\s+/g)) {
        const at = match.index;
        if (at < 25 || at > 76) continue;
        const before = sentence.slice(0, at), after = sentence.slice(at).trimStart();
        if (tt.test(before) || (language === 'es' && rt.test(before))) continue;
        const conjunction = language === 'es' ? /^(?:pero|porque|aunque|mientras|antes de|después de|hasta que|cuando|donde|si|para que|sin embargo|entonces|y|o)\b/i : /^(?:but|because|although|while|unless|before|after|until|when|where|if|so that|even if|and then|and|or|yet)\b/i;
        const pause = /[,;:]$/.test(before) || conjunction.test(after);
        candidates.push({ at, score: Math.abs(at - 54) - (pause ? 26 : 0) });
      }
      const best = candidates.sort((a, b) => a.score - b.score)[0];
      if (!best) break; // Never cut through a word or a name without a boundary.
      lines.push(sentence.slice(0, best.at).trim()); sentence = sentence.slice(best.at).trim();
    }
    if (/\p{Script=Latin}/u.test(sentence)) lines.push(sentence);
  }
  return lines;
}

export function extractSubtitles(script, selectedLanguage = 'auto') {
  if (selectedLanguage === 'zh') return extractChineseSubtitles(script);
  const rawLines = script.split('\n');
  const markedMatches = rawLines.map(l => l.trim().replace(/^[-*]\s+/, '').match(marker)).filter(Boolean);
  const hasMarked = markedMatches.length > 0;
  const hasEnMarker = markedMatches.some(m => (m[1] || m[2] || m[3] || '').toUpperCase() === 'EN');
  const hasEpisodeOrDirection = rawLines.some(l => titleOrEp.test(l.trim())) || rawLines.some(l => /^(?:△|▲|Δ)/.test(l.trim()));
  const candidateUnmarked = rawLines.map(l => cleanUnmarkedSpeakerLine(l.trim())).filter(Boolean);
  const detectedLangs = candidateUnmarked.map(t => detectSpanishOrEnglish(t, ''));
  const esCount = detectedLangs.filter(l => l === 'es').length;
  const enCount = detectedLangs.filter(l => l === 'en').length;
  const allowUnmarkedEs = !hasEnMarker && selectedLanguage !== 'en' && (selectedLanguage === 'es' || (candidateUnmarked.length >= 2 && esCount > enCount) || (hasMarked && hasEpisodeOrDirection && esCount > 0));
  const allowUnmarked = (!hasMarked && hasEpisodeOrDirection) || allowUnmarkedEs;
  const defaultLang = (esCount > enCount || allowUnmarkedEs) ? 'es' : 'en';

  const utterances = []; let current = null;
  for (const [index, raw] of rawLines.entries()) {
    let text = raw.trim();
    if (titleOrEp.test(text)) { current = null; continue; }
    const strippedItem = text.replace(/^[-*]\s+/, '');
    if (marker.test(strippedItem)) text = strippedItem;
    const marked = text.match(marker);
    if (marked) {
      const language = (marked[1] || marked[2] || marked[3] || 'ES').toUpperCase() === 'EN' ? 'en' : 'es';
      if (selectedLanguage !== 'auto' && selectedLanguage !== language) { current = null; continue; }
      const outer = !!marked[3];
      text = text.slice(marked[0].length).trim();
      if (outer) text = text.replace(/\]\s*$/, '');
      if (/^[△▲]/.test(text)) { current = null; continue; }
      text = dialogueAfterSpeaker(text);
      current = { sourceLine: index + 1, language, text }; utterances.push(current);
    } else if (allowUnmarked && cleanUnmarkedSpeakerLine(text) !== null) {
      const cleanContent = cleanUnmarkedSpeakerLine(text);
      const language = detectSpanishOrEnglish(cleanContent, defaultLang);
      if (selectedLanguage !== 'auto' && selectedLanguage !== language) { current = null; continue; }
      current = { sourceLine: index + 1, language, text: cleanContent }; utterances.push(current);
    } else if (current && text && cleanUnmarkedSpeakerLine(text) === null && !direction.test(text) && !reservedSpeakers.test(text.split(/[:：]/, 1)[0].trim()) && !/[\p{Script=Han}△▲Δ]|^\[|^【/u.test(text) && !/^[\p{Lu}][\p{Lu} _.'()-]{0,70}[:：]/u.test(text)) {
      current.text += ' ' + text;
    } else current = null;
  }
  return utterances.flatMap(item => rhythmLines(item.text, item.language).map(text => ({ sourceLine: item.sourceLine, language: item.language, speaker: '', kind: 'dialogue', text })))
    .map((line, index) => ({ id: `line-${index + 1}`, ...line }));
}

export function extractEnglish(script) { return extractSubtitles(script, 'en'); }
