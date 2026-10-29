// Whole-drama script episode splitter & .docx/.txt reader for XM Editing Studio.

const CN_NUMS = {
  零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 百: 100,
};

export function parseChineseEpisodeNumber(raw) {
  const s = String(raw || '').trim();
  if (/^\d+$/.test(s)) return Number(s);
  let total = 0;
  let current = 0;
  for (const ch of s) {
    const val = CN_NUMS[ch];
    if (val === undefined) return NaN;
    if (val === 10 || val === 100) {
      total += (current || 1) * val;
      current = 0;
    } else {
      current = current * 10 + val;
    }
  }
  return total + current || NaN;
}

const EPISODE_HEADING_RE =
  /^\s*(?:[#*]+\s*)?(?:【|《|\[|（|\()?\s*(?:第\s*([0-9]{1,4}|[零〇一二两三四五六七八九十百]{1,6})\s*[集话回幕期]|(?:Episode|EP)\.?\s*0*([0-9]{1,4}))\s*(?:】|》|\]|）|\))?(?:[\s:：—\-·、.|]+(.*))?$/i;

const SCENE_EPISODE_RE = /^\s*0*([1-9]\d{0,2})\s*[-–—]\s*0*([1-9]\d{0,2})(?:\s+|[\s:：,，、.])(.*)$/;

export function splitDramaEpisodes(rawText = '') {
  const text = String(rawText || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!text) return [];

  const lines = text.split('\n');

  // Pass 1: Explicit Episode Headings (e.g., "第1集", "第一集", "【第02集】", "EP 1", "Episode 03")
  const explicitMatches = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (!line || line.length > 80) continue;
    const m = line.match(EPISODE_HEADING_RE);
    if (m) {
      const epNum = m[1] ? parseChineseEpisodeNumber(m[1]) : Number(m[2]);
      if (Number.isFinite(epNum) && epNum > 0 && epNum <= 2000) {
        explicitMatches.push({
          lineIndex: idx,
          episodeNumber: epNum,
          rawHeading: line,
          subtitle: (m[3] || '').trim(),
        });
      }
    }
  }

  if (explicitMatches.length >= 2 || (explicitMatches.length === 1 && explicitMatches[0].lineIndex <= 5)) {
    const episodes = [];
    for (let i = 0; i < explicitMatches.length; i++) {
      const cur = explicitMatches[i];
      const start = i === 0 ? 0 : cur.lineIndex;
      const end = i + 1 < explicitMatches.length ? explicitMatches[i + 1].lineIndex : lines.length;
      const chunk = lines.slice(start, end).join('\n').trim();
      if (!chunk) continue;
      const label = `第${cur.episodeNumber}集`;
      const title = cur.subtitle ? `${label} · ${cur.subtitle.slice(0, 22)}` : label;
      episodes.push({
        episodeNumber: cur.episodeNumber,
        episodeLabel: label,
        title,
        script: chunk,
      });
    }
    if (episodes.length >= 1) return episodes;
  }

  // Pass 2: Short-Drama Scene Numbering (e.g., "1-1 日 外 ...", "1-2 ...", "2-1 夜 内 ...")
  const sceneHeaders = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (!line || line.length > 90) continue;
    const m = line.match(SCENE_EPISODE_RE);
    if (m) {
      const epNum = Number(m[1]);
      if (Number.isFinite(epNum) && epNum > 0 && epNum <= 2000) {
        sceneHeaders.push({ lineIndex: idx, episodeNumber: epNum, rawHeading: line });
      }
    }
  }

  const distinctSceneEpisodes = new Set(sceneHeaders.map(s => s.episodeNumber));
  if (distinctSceneEpisodes.size >= 2) {
    // Group contiguous or matching episode numbers in order of appearance
    const firstLineByEp = [];
    const seenEp = new Set();
    for (const sh of sceneHeaders) {
      if (!seenEp.has(sh.episodeNumber)) {
        seenEp.add(sh.episodeNumber);
        firstLineByEp.push(sh);
      }
    }
    const episodes = [];
    for (let i = 0; i < firstLineByEp.length; i++) {
      const cur = firstLineByEp[i];
      const start = i === 0 ? 0 : cur.lineIndex;
      const end = i + 1 < firstLineByEp.length ? firstLineByEp[i + 1].lineIndex : lines.length;
      const chunk = lines.slice(start, end).join('\n').trim();
      if (!chunk) continue;
      const label = `第${cur.episodeNumber}集`;
      episodes.push({
        episodeNumber: cur.episodeNumber,
        episodeLabel: label,
        title: `${label} · ${cur.rawHeading.slice(0, 22)}`,
        script: chunk,
      });
    }
    if (episodes.length >= 2) return episodes;
  }

  // Pass 3: Horizontal Rule / Divider Blocks (===, ---, ***)
  const dividerChunks = text
    .split(/\n\s*(?:={3,}|-{4,}|\*{3,}|＿{3,})\s*\n/)
    .map(c => c.trim())
    .filter(Boolean);
  if (dividerChunks.length >= 2) {
    return dividerChunks.map((chunk, idx) => {
      const epNum = idx + 1;
      const label = `第${epNum}集`;
      const firstLine = (chunk.split('\n').find(l => l.trim()) || '').trim().slice(0, 22);
      return {
        episodeNumber: epNum,
        episodeLabel: label,
        title: firstLine ? `${label} · ${firstLine}` : label,
        script: chunk,
      };
    });
  }

  // Single episode fallback
  const firstLine = (lines.find(l => l.trim()) || '第1集').trim().slice(0, 24);
  return [
    {
      episodeNumber: 1,
      episodeLabel: '第1集',
      title: `第1集 · ${firstLine}`,
      script: text,
    },
  ];
}

// Extract plain text from a .docx (ZIP containing word/document.xml) ArrayBuffer in browser
export async function extractTextFromDocxArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Locate Central Directory or scan Local File Headers (0x04034b50)
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const name = new TextDecoder('utf-8').decode(bytes.subarray(offset + 30, offset + 30 + nameLen));
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (name === 'word/document.xml' && dataEnd <= bytes.length) {
      const rawSlice = bytes.subarray(dataStart, dataEnd);
      let xmlText = '';
      if (method === 0) {
        xmlText = new TextDecoder('utf-8').decode(rawSlice);
      } else if (method === 8 && typeof DecompressionStream === 'function') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(rawSlice);
        writer.close();
        const decompressed = await new Response(ds.readable).arrayBuffer();
        xmlText = new TextDecoder('utf-8').decode(decompressed);
      }
      if (xmlText) {
        return xmlText
          .replace(/<\/w:p>/g, '\n')
          .replace(/<w:br[^>]*\/>/g, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .trim();
      }
    }
    if (compSize === 0) break;
    offset = dataEnd;
  }
  throw new Error('无法解析该 Word (.docx) 文件，请另存为 UTF-8 .txt 文本后上传。');
}
