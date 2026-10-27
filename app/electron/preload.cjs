const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("blackObsidian", {
  layoutWebAI: input => ipcRenderer.invoke('bos:web-ai-layout', input),
  webAIAction: (id, action) => ipcRenderer.invoke('bos:web-ai-action', id, action),
  copyWebAITask: (draft, purpose) => ipcRenderer.invoke('bos:web-ai-copy-task', draft, purpose),
  analyzeWebScript: request => ipcRenderer.invoke('bos:web-analysis-start', request),
  getWebAnalysisTask: () => ipcRenderer.invoke('bos:web-analysis-status'),
  webAnalysisAction: (id, action, value) => ipcRenderer.invoke('bos:web-analysis-action', id, action, value),
  onWebAnalysisTask: callback => { const listener = (_event, value) => callback(value); ipcRenderer.on('bos:web-analysis-task', listener); return () => ipcRenderer.removeListener('bos:web-analysis-task', listener); },
  getWatermarkState: () => ipcRenderer.invoke('bos:watermark:get-state'),
  chooseWatermarkVideos: () => ipcRenderer.invoke('bos:watermark:choose-videos'),
  addWatermarkVideos: filesOrPaths => {
    if (!Array.isArray(filesOrPaths) || filesOrPaths.length === 0) return ipcRenderer.invoke('bos:watermark:get-state');
    const resolved = filesOrPaths.slice(0, 200).map(item => {
      if (typeof item === 'string') return item;
      const p = webUtils.getPathForFile(item);
      if (!p) throw new Error('无法读取拖入视频的本地路径，请使用选择视频按钮添加。');
      return p;
    });
    return ipcRenderer.invoke('bos:watermark:add-videos', resolved);
  },
  chooseWatermarkImage: () => ipcRenderer.invoke('bos:watermark:choose-image'),
  chooseWatermarkOutputDir: () => ipcRenderer.invoke('bos:watermark:choose-output-dir'),
  updateWatermarkSettings: patch => ipcRenderer.invoke('bos:watermark:update-settings', patch),
  removeWatermarkJob: jobId => ipcRenderer.invoke('bos:watermark:remove-job', jobId),
  clearWatermarkJobs: mode => ipcRenderer.invoke('bos:watermark:clear-jobs', mode),
  retryWatermarkJobs: () => ipcRenderer.invoke('bos:watermark:retry-failed'),
  startWatermarkBatch: () => ipcRenderer.invoke('bos:watermark:start'),
  cancelWatermarkBatch: () => ipcRenderer.invoke('bos:watermark:cancel'),
  openWatermarkPath: targetPath => ipcRenderer.invoke('bos:watermark:open-path', targetPath),
  onWatermarkState: callback => { const listener = (_event, value) => callback(value); ipcRenderer.on('bos:watermark-state', listener); return () => ipcRenderer.removeListener('bos:watermark-state', listener); },
  onTrayNavigate: callback => { const listener = (_event, value) => callback(value); ipcRenderer.on('bos:tray-navigate', listener); return () => ipcRenderer.removeListener('bos:tray-navigate', listener); },
  prepareMusicDrag: input => ipcRenderer.invoke('bos:prepare-music-drag', input),
  startMusicDrag: token => ipcRenderer.send('bos:start-music-drag', token),
  onMusicDragError: callback => { const listener = (_event, value) => callback(value); ipcRenderer.on('bos:music-drag-error', listener); return () => ipcRenderer.removeListener('bos:music-drag-error', listener); },
  getPeriodKeeperStatus: () => ipcRenderer.invoke('bos:period-status'),
  probePeriodKeeper: () => ipcRenderer.invoke('bos:period-probe'),
  setPeriodKeeperEnabled: (enabled, mode) => ipcRenderer.invoke('bos:period-enabled', enabled, mode),
  copySubtitleText: text => ipcRenderer.invoke('bos:period-copy', text),
  jianyingAction: (action, args, connection) => ipcRenderer.invoke('bos:jianying-action', action, args, connection),
  chooseJianyingFiles: () => ipcRenderer.invoke('bos:jianying-files'),
  quickLaunch: (action, value) => ipcRenderer.invoke('bos:quick-launch', action, value),
  chooseDirectory: () => ipcRenderer.invoke("bos:choose-directory"),
  writeCache: payload => ipcRenderer.invoke("bos:write-cache", payload),
  readCache: payload => ipcRenderer.invoke("bos:read-cache", payload),
  downloadAudio: payload => ipcRenderer.invoke("bos:download-audio", payload),
  exportScriptMaterials: payload => ipcRenderer.invoke("bos:export-script-materials", payload),
  getMusicLibrary: () => ipcRenderer.invoke('bos:music-library-list'),
  connectMusicLibrary: () => ipcRenderer.invoke('bos:music-library-connect'),
  refreshMusicLibrary: () => ipcRenderer.invoke('bos:music-library-refresh'),
  disconnectMusicLibrary: id => ipcRenderer.invoke('bos:music-library-disconnect', id),
  getUpdaterStatus: () => ipcRenderer.invoke('bos:updater-status'),
  updaterAction: action => ipcRenderer.invoke('bos:updater-action', action),
  onUpdaterState: callback => { const listener = (_event, value) => callback(value); ipcRenderer.on('bos:updater-state', listener); return () => ipcRenderer.removeListener('bos:updater-state', listener); },
  setTitleBarTheme: scheme => ipcRenderer.invoke('bos:titlebar-theme', scheme),
});
