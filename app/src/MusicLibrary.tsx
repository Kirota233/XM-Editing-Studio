import { SegmentRecommendations } from './SegmentRecommendations.jsx';
import { MusicDragButton } from './MusicDragButton.jsx';
import { Pagination, usePages } from './Pagination.jsx';
import { usePanelCollapsed } from './PanelState.jsx';
import { CUSTOM_KEYWORDS_LIMIT, parseCustomKeywords, searchMusicTitles, sameLibraryRequest } from '../shared/library-search.mjs';
import { excludeUsedMusic, shuffleMusicResults, MUSIC_USAGE_LIMIT } from '../shared/library-usage.mjs';
import { musicUsage } from './MusicUsage.mjs';
import { analysisName, analysisReady, webAnalyzer } from '../shared/script-analyzers.mjs';
import { requestScriptAnalysis } from './AnalysisRequest.mjs';

declare const i: any;

const RESULT_KEY = 'black-obsidian.library-match.v1';
const emptyCatalog = { directories: [] as any[], tracks: [] as any[], revision: '', warning: '' };
let matchState: any = { busy: false, record: null, error: '' };
let activeRequest: any = null;
try { matchState.record = JSON.parse(localStorage.getItem(RESULT_KEY) || 'null'); } catch { /* no previous analysis */ }
const subscribers = new Set<() => void>();
const subscribe = (listener: () => void) => { subscribers.add(listener); return () => subscribers.delete(listener); };
const snapshot = () => matchState;
const publish = (values: any) => { matchState = { ...matchState, ...values }; subscribers.forEach(listener => listener()); };

export function clearCurrentLibraryMatch(projectId: string, draft: any) {
  const cancel = activeRequest?.projectId === projectId;
  if (cancel) { activeRequest.controller.abort(); activeRequest = null; }
  const sameRecord = sameLibraryRequest(matchState.record, draft);
  if (sameRecord) { try { localStorage.removeItem(RESULT_KEY); } catch { /* reset in-memory */ } }
  publish({ ...(cancel ? { busy: false } : {}), ...(sameRecord ? { record: null } : {}), error: '' });
}

export function MusicLibrary({ input, projectId, savedRecommendation, onAnalysis, onChange, lines, gemini, generationAnalyzer = gemini, settings, onUse, onGenerate, segmentJob, onViewJob }: any) {
  const analyzerName = analysisName(gemini);
  const [catalog, setCatalog] = i.useState(emptyCatalog);
  const [scanning, setScanning] = i.useState(false);
  const [error, setError] = i.useState('');
  const [notice, setNotice] = i.useState('');
  const [collapsed, toggleCollapsed] = usePanelCollapsed('local-music');
  const [analysisCollapsed, toggleAnalysisCollapsed] = usePanelCollapsed('music-analysis');
  const [analysisError, setAnalysisError] = i.useState('');
  const [analysisNotice, setAnalysisNotice] = i.useState('');
  const match = i.useSyncExternalStore(subscribe, snapshot);
  const usage = i.useSyncExternalStore(musicUsage.subscribe, musicUsage.snapshot);
  const [historyCollapsed, toggleHistory] = usePanelCollapsed('music-usage');
  const [randomOrder, setRandomOrder] = i.useState(true);
  const [shuffleRevision, setShuffleRevision] = i.useState(0);
  const eligibleTracks = i.useMemo(() => excludeUsedMusic(catalog.tracks, usage.history), [catalog.tracks, usage.history]);
  const historyPages = usePages(usage.history);
  const api = (globalThis as any).blackObsidian;
  const ready = typeof api?.getMusicLibrary === 'function';
  const catalogPages = usePages(catalog.tracks);
  const keywordText = input.customKeywords || '';
  const search = i.useMemo(() => {
    try {
      const keywords = parseCustomKeywords(keywordText);
      const all = searchMusicTitles(catalog.tracks, keywords);
      const eligible = new Set(eligibleTracks.map((track: any) => track.id));
      const results = all.filter((item: any) => eligible.has(item.track.id));
      return { keywords, results, excluded: all.length - results.length, error: '' };
    } catch (err: any) {
      return { keywords: [], results: [], excluded: 0, error: err.message };
    }
  }, [keywordText, catalog.tracks, eligibleTracks]);
  const orderedResults = i.useMemo(() => randomOrder ? shuffleMusicResults(search.results) : search.results, [search.results, randomOrder, shuffleRevision]);
  const searchPages = usePages(orderedResults);

  i.useEffect(() => { searchPages.setPage(1); }, [keywordText, catalog.revision, randomOrder, shuffleRevision, usage.history]);
  i.useEffect(() => { historyPages.setPage(1); }, [usage.history]);

  const changeKeywords = (value: string) => { onChange({ customKeywords: value }); setError(''); setNotice(''); };
  const addKeyword = (word: string) => {
    try {
      const words = parseCustomKeywords([...search.keywords, word].join('，'));
      const value = words.join('，');
      parseCustomKeywords(value);
      changeKeywords(value);
      setAnalysisError(''); setAnalysisNotice(`已加入检索词「${word}」`);
    } catch (err: any) {
      setAnalysisError(err.message);
    }
  };

  i.useEffect(() => {
    let active = true;
    if (ready) api.getMusicLibrary().then((value: any) => { if (active) setCatalog(value); }).catch((err: any) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  const changeCatalog = async (operation: () => Promise<any>) => {
    if (!ready) { setError('连接本地盘需要使用桌面版程序。'); return; }
    if (scanning) return;
    setScanning(true); setError('');
    try { setCatalog(await operation()); setNotice('音乐库索引已同步更新。'); }
    catch (err: any) { setError(err.message || '无法读取音乐库。'); }
    finally { setScanning(false); }
  };

  const analyze = async () => {
    if (matchState.busy) return;
    if (!input.script.trim()) { setAnalysisError('请先粘贴完整剧本。'); return; }
    if (search.error) { setAnalysisError(search.error); return; }
    if (!analysisReady(gemini)) { setAnalysisError('请选择可用的剧本分析模型。'); return; }
    setAnalysisError(''); setAnalysisNotice(''); publish({ busy: true, error: '', analyzer: analyzerName });
    const request = { projectId, controller: new AbortController() };
    activeRequest = request;
    const captured = { script: input.script, title: input.title, hint: input.hint, customKeywords: keywordText, segmented: !!input.segmented, segmentCount: Number(input.segmentCount || 3), analyzer: analyzerName, libraryGeminiKey: gemini.key || input.libraryGeminiKey || '' };
    try {
      const value = await requestScriptAnalysis('library-match', { ...captured, provider: gemini.provider, model: gemini.model, tracks: excludeUsedMusic(catalog.tracks, musicUsage.snapshot().history).map(({ id, title }: any) => ({ id, title })) }, webAnalyzer(gemini) ? request.controller.signal : AbortSignal.any([request.controller.signal, AbortSignal.timeout(255000)]));
      if (activeRequest !== request) return;
      if (value.segments) value.segments = value.segments.map((segment: any) => ({ ...segment, matches: segment.matches.map((m: any) => ({ ...m, title: catalog.tracks.find((track: any) => track.id === m.id)?.title || m.id })) }));
      const record = { ...captured, revision: catalog.revision, value: { ...value, matches: (value.matches || []).map((m: any) => ({ ...m, title: catalog.tracks.find((t: any) => t.id === m.id)?.title || m.id })) } };
      let storageMessage = '';
      try { localStorage.setItem(RESULT_KEY, JSON.stringify(record)); } catch { storageMessage = '结果暂时无法缓存。'; }
      onAnalysis(projectId, record);
      publish({ busy: false, record, error: storageMessage });
    } catch (err: any) {
      if (activeRequest === request) publish({ busy: false, error: request.controller.signal.aborted ? '分析已中断。' : err.message || `${analyzerName} 分析失败。` });
    } finally {
      if (activeRequest === request) activeRequest = null;
    }
  };

  const records = [savedRecommendation, match.record];
  const record = records.find(r => sameLibraryRequest(r, input)) || records.find(r => r && r.script === input.script);
  const current = sameLibraryRequest(record, input);
  const result = record?.value || null;
  const available = result?.matches?.flatMap((m: any) => {
    const track = catalog.tracks.find((t: any) => t.id === m.id);
    return [{ ...m, available: !!track, track: track || { id: m.id, title: m.title || '历史音乐', relativePath: '音乐当前未连接' } }];
  }) || [];
  const matchPages = usePages(available);

  i.useEffect(() => { catalogPages.setPage(1); }, [catalog.revision]);
  i.useEffect(() => { matchPages.setPage(1); }, [result]);

  const useAndRemember = async (...args: any[]) => {
    await onUse(...args);
    musicUsage.remember(args[0]);
  };

  const markUsed = (track: any, source = 'library') => {
    musicUsage.remember(track);
    (source === 'analysis' ? setAnalysisNotice : setNotice)(`已标记「${track.title}」，后续自动避开最近 ${MUSIC_USAGE_LIMIT} 首已用曲目。`);
  };

  const useTrack = async (item: any) => {
    try { setAnalysisError(''); await useAndRemember(item.track, result.analysis, item.reason, lines); setAnalysisNotice(`已选用「${item.track.title}」`); }
    catch (err: any) { setAnalysisError(err.message); }
  };

  const useSearchTrack = async (item: any) => {
    try {
      setError('');
      const reason = `手动检索，音乐标题命中：${item.keywords.join('、')}`.slice(0, 500);
      await useAndRemember(item.track, { summary: '按自定义关键词检索本地音乐，由用户试听后选用；未调用 AI 评估。', keywords: search.keywords }, reason, lines);
      setNotice(`已选用「${item.track.title}」`);
    } catch (err: any) { setError(err.message); }
  };

  return (
    <>
      <section className="bos-library bos-script-panel" aria-labelledby="bos-library-title">
        <div className="bos-library-heading">
          <div>
            <span className="bos-script-eyebrow">LOCAL CATALOG</span>
            <h3 id="bos-library-title">本地音乐库 <small className="bos-count-chip">{catalog.tracks.length} 首</small></h3>
          </div>
          <div className="bos-script-actions">
            <button type="button" disabled={scanning} onClick={() => changeCatalog(() => api.connectMusicLibrary())}>
              {scanning ? '扫描中…' : '＋ 连接文件夹'}
            </button>
            <button type="button" disabled={scanning || !catalog.directories.length} onClick={() => changeCatalog(() => api.refreshMusicLibrary())}>
              刷新
            </button>
            <button type="button" className="bos-panel-toggle" aria-expanded={!collapsed} aria-controls="bos-library-body" onClick={toggleCollapsed}>
              {collapsed ? '展开' : '收起'} <span aria-hidden="true">{collapsed ? '⌄' : '⌃'}</span>
            </button>
          </div>
        </div>
        <div id="bos-library-body" hidden={collapsed}>
          {error && <div className="bos-script-alert" role="alert">{error}</div>}
          {usage.error && <p className="bos-script-warning" role="alert">{usage.error}</p>}
          <div className="bos-library-folders">
            {catalog.directories.map((folder: any) => (
              <div key={folder.id}>
                <div>
                  <strong>{folder.path}</strong>
                  <small>{folder.error || `${folder.count} 首音频`}</small>
                </div>
                <button type="button" aria-label={`断开音乐文件夹 ${folder.path}`} disabled={scanning} onClick={() => changeCatalog(() => api.disconnectMusicLibrary(folder.id))}>
                  断开
                </button>
              </div>
            ))}
          </div>
          {!catalog.directories.length && <p className="bos-library-empty">连接本地配乐目录后，即可即时检索或交给 AI 按剧情匹配</p>}
          {catalog.warning && <p className="bos-script-warning">{catalog.warning}</p>}
          {!!catalog.tracks.length && (
            <details className="bos-library-index">
              <summary>查看全部收录曲目 ({catalog.tracks.length} 首)</summary>
              <ul aria-label="本页音乐标题">
                {catalogPages.visible.map((track: any) => (
                  <li key={track.id}>
                    <span>{track.title}</span>
                    <small>{track.relativePath}</small>
                    <MusicDragButton libraryId={track.id} />
                  </li>
                ))}
              </ul>
              <Pagination {...catalogPages} label="音乐库页码" />
            </details>
          )}
          <div className="bos-library-search">
            <div className="bos-search-header">
              <label htmlFor="bos-library-search-input">
                <span>关键词秒搜 <small>{keywordText.length} / {CUSTOM_KEYWORDS_LIMIT}</small></span>
                <textarea
                  id="bos-library-search-input"
                  rows={1}
                  maxLength={CUSTOM_KEYWORDS_LIMIT}
                  value={keywordText}
                  onChange={(event: any) => changeKeywords(event.target.value)}
                  aria-describedby="bos-library-search-help"
                  aria-invalid={!!search.error}
                  placeholder="输入情绪、乐器或流派（逗号分隔，如：悬疑，悲伤，piano）"
                />
              </label>
              {keywordText && <button type="button" className="bos-clear-chip" onClick={() => changeKeywords('')}>清空</button>}
            </div>
            <small id="bos-library-search-help" className="bos-visually-hidden">逗号或分号分隔最多 20 个词</small>
            {search.error && <p className="bos-script-warning" role="alert">{search.error}</p>}
            {!!search.keywords.length && (
              <div className="bos-library-keywords" aria-label="自定义检索词">
                {search.keywords.map((word: string) => (
                  <button type="button" key={word} aria-label={`移除关键词 ${word}`} onClick={() => changeKeywords(search.keywords.filter((item: string) => item !== word).join('，'))}>
                    {word} <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            )}
            {!!search.keywords.length && (
              <details className="bos-library-search-results" open>
                <summary>命中结果 · {search.results.length} 首</summary>
                <div className="bos-library-random-tools">
                  <div className="bos-script-actions" role="group" aria-label="检索结果排序">
                    <button type="button" aria-pressed={randomOrder} onClick={() => { setRandomOrder(true); setShuffleRevision((value: number) => value + 1); }} disabled={!search.results.length}>
                      {randomOrder ? '随机换一批' : '随机排序'}
                    </button>
                    <button type="button" aria-pressed={!randomOrder} onClick={() => setRandomOrder(false)} disabled={!search.results.length}>
                      按匹配度
                    </button>
                  </div>
                  <small>已过滤最近使用的 {search.excluded} 首</small>
                </div>
                {!search.results.length && (
                  <p className="bos-library-empty">
                    {search.excluded ? '匹配的音乐都在最近使用记录中，已自动避开。' : catalog.tracks.length ? '未命中标题，可尝试更换同义词或使用下方 AI 匹配。' : '请先连接音乐文件夹。'}
                  </p>
                )}
                {searchPages.visible.map((item: any, index: number) => (
                  <article className="bos-library-match" key={item.track.id}>
                    <div className="bos-library-match-title">
                      <span>{String((searchPages.page - 1) * 5 + index + 1).padStart(2, '0')}</span>
                      <div>
                        <h4>{item.track.title}</h4>
                        <small>{item.track.relativePath} · 命中：{item.keywords.join(' / ')}</small>
                      </div>
                      <button type="button" disabled={!input.script.trim() || scanning} onClick={() => useSearchTrack(item)}>
                        选用此音乐
                      </button>
                    </div>
                    <audio controls preload="none" src={`/local-music/${item.track.id}`} aria-label={`检索试听 ${item.track.title}`} />
                    <div className="bos-library-use-tools">
                      <MusicDragButton libraryId={item.track.id} />
                      <button type="button" onClick={() => markUsed(item.track)}>标记已使用</button>
                    </div>
                  </article>
                ))}
                {!!search.results.length && <Pagination {...searchPages} label="自定义检索结果页码" />}
              </details>
            )}
          </div>
          <section className="bos-library-history" aria-label="历史使用音乐">
            <div className="bos-library-history-heading">
              <div>
                <h4>最近使用记录 <small>{usage.history.length} / {MUSIC_USAGE_LIMIT}</small></h4>
              </div>
              <button type="button" className="bos-panel-toggle" aria-expanded={!historyCollapsed} aria-controls="bos-music-usage-body" onClick={toggleHistory}>
                {historyCollapsed ? '展开历史' : '收起历史'}
              </button>
            </div>
            <div id="bos-music-usage-body" hidden={historyCollapsed}>
              {!usage.history.length && <p className="bos-library-empty">暂无使用记录</p>}
              {historyPages.visible.map((item: any) => {
                const track = catalog.tracks.find((t: any) => t.id === item.id);
                return (
                  <article className="bos-library-match" key={item.id}>
                    <div className="bos-library-match-title">
                      <div>
                        <h4>{track?.title || item.title}</h4>
                        <small>{item.usedAt ? new Date(item.usedAt).toLocaleString() : '此前使用'}</small>
                      </div>
                      <span className="bos-library-used-badge">已避开</span>
                    </div>
                    {track ? (
                      <>
                        <audio controls preload="none" src={'/local-music/' + track.id} aria-label={'历史试听 ' + track.title} />
                        <MusicDragButton libraryId={track.id} />
                      </>
                    ) : (
                      <p className="bos-script-footnote">音乐当前未连接或已移除，使用记录仍保留。</p>
                    )}
                  </article>
                );
              })}
              {usage.history.length > 5 && <Pagination {...historyPages} label="历史使用音乐页码" />}
            </div>
          </section>
          {notice && <p role="status" className="bos-script-message">{notice}</p>}
        </div>
      </section>

      <section className="bos-library bos-script-panel bos-music-analysis-panel" aria-labelledby="bos-music-analysis-title">
        <div className="bos-library-heading">
          <div>
            <span className="bos-script-eyebrow">AI SOUNDTRACK MATCHER</span>
            <h3 id="bos-music-analysis-title">AI 剧情配乐匹配</h3>
          </div>
          <div className="bos-script-actions">
            <span className="bos-status-pill" role="status">
              {match.busy ? `${analysisName(match.analyzer || analyzerName)} 分析中…` : result ? '已生成推荐' : '就绪'}
            </span>
            <button type="button" className="bos-panel-toggle" aria-expanded={!analysisCollapsed} aria-controls="bos-music-analysis-body" onClick={toggleAnalysisCollapsed}>
              {analysisCollapsed ? '展开' : '收起'} <span aria-hidden="true">{analysisCollapsed ? '⌄' : '⌃'}</span>
            </button>
          </div>
        </div>
        <div id="bos-music-analysis-body" hidden={analysisCollapsed}>
          {settings}
          <div className="bos-music-analysis-context">
            <span>模型：{analyzerName}</span>
            <span>{input.segmented ? `分段模式 (${input.segmentCount || 3} 段)` : '整篇模式'}</span>
            <span>候选池：{eligibleTracks.length} 首</span>
            {!!search.keywords.length && <span>检索词：{search.keywords.join(' · ')}</span>}
          </div>
          {(analysisError || match.error || search.error) && (
            <div className="bos-script-alert" role="alert">{analysisError || match.error || search.error}</div>
          )}
          {usage.error && <p className="bos-script-warning" role="alert">{usage.error}</p>}
          <div className="bos-library-analyze">
            <button
              type="button"
              className="bos-script-primary"
              disabled={match.busy || scanning || !input.script.trim() || !!search.error}
              onClick={analyze}
            >
              {match.busy
                ? `${analysisName(match.analyzer || analyzerName)} 正在分析与匹配…`
                : input.segmented
                  ? `${analyzerName} 分情节分析并推荐音乐`
                  : search.keywords.length
                    ? `${analyzerName} 结合自定义关键词匹配`
                    : `${analyzerName} 识别剧本关键词并匹配`}
            </button>
            {match.busy && <button type="button" onClick={() => activeRequest?.controller.abort()}>中断分析</button>}
          </div>
          {result && (
            <div className="bos-library-analysis">
              <div className="bos-analysis-summary-card">
                <h4>剧情氛围与关键词</h4>
                <p>{result.analysis.summary}</p>
                <div className="bos-library-keywords">
                  {result.analysis.keywords.map((word: string) => (
                    <button
                      type="button"
                      key={word}
                      disabled={!!search.error || search.keywords.some((term: string) => term.toLocaleLowerCase() === word.toLocaleLowerCase())}
                      title={`加入检索：${word}`}
                      onClick={() => addKeyword(word)}
                    >
                      {word} <span aria-hidden="true">＋</span>
                    </button>
                  ))}
                </div>
              </div>
              {record.revision !== catalog.revision && <p className="bos-script-warning">音乐库已更新，重新匹配可纳入新曲目。</p>}
              <div className="bos-script-section-title">
                <h4>{result.segments ? '各情节推荐配乐' : '推荐配乐'}</h4>
                <small>候选 {result.evaluated} / {result.total} 首</small>
              </div>
              {!result.segments && !available.length && (
                <p className="bos-library-empty">{result.total ? '暂无匹配曲目，可尝试切换 Suno 生成配乐。' : '关键词已提取，连接本地音乐库后即可匹配。'}</p>
              )}
              {result.segments && (
                <SegmentRecommendations
                  segments={result.segments}
                  tracks={catalog.tracks}
                  current={current}
                  lines={lines}
                  onUse={useAndRemember}
                  onError={setAnalysisError}
                  onGenerate={onGenerate}
                  segmentJob={segmentJob}
                  onViewJob={onViewJob}
                  onMarkUsed={(track: any) => markUsed(track, 'analysis')}
                  usedIds={usage.history.map((track: any) => track.id)}
                  analyzer={generationAnalyzer}
                />
              )}
              {matchPages.visible.map((item: any, index: number) => (
                <article className="bos-library-match" key={item.id}>
                  <div className="bos-library-match-title">
                    <span>{String((matchPages.page - 1) * 5 + index + 1).padStart(2, '0')}</span>
                    <div>
                      <h4>{item.track.title}</h4>
                      <small>{item.track.relativePath}</small>
                    </div>
                    <button type="button" disabled={!item.available || !current} onClick={() => useTrack(item)}>
                      {!item.available ? '需连接音乐库' : !current ? '请重新匹配' : '选用此音乐'}
                    </button>
                  </div>
                  <p>{item.reason}</p>
                  <div className="bos-library-keywords">
                    {item.keywords.map((word: string, idx: number) => <span key={`${word}-${idx}`}>{word}</span>)}
                  </div>
                  {item.available && <audio controls preload="none" src={`/local-music/${item.id}`} aria-label={`试听 ${item.track.title}`} />}
                  {item.available && (
                    <div className="bos-library-use-tools">
                      <MusicDragButton libraryId={item.id} />
                      <button
                        type="button"
                        disabled={usage.history.some((track: any) => track.id === item.id)}
                        onClick={() => markUsed(item.track, 'analysis')}
                      >
                        {usage.history.some((track: any) => track.id === item.id) ? '已标记使用' : '标记已使用'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
              {available.length > 5 && <Pagination {...matchPages} label="推荐音乐页码" />}
            </div>
          )}
          {analysisNotice && <p role="status" className="bos-script-message">{analysisNotice}</p>}
        </div>
      </section>
    </>
  );
}
