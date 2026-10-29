import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = path.join(root, 'baseline');
const jsName = 'index-sP0cbikv.js';
const cssName = 'index-DzzkVdoP.css';
const compiled = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : (await build({ entryPoints: [path.join(root, 'src/upgrade.tsx')], bundle: true, write: false, format: 'iife', globalName: 'BOSMusicUpgrade', jsxFactory: 'i.createElement', jsxFragment: 'i.Fragment', target: 'chrome140', minify: true })).outputFiles[0].text;
if (!compiled.includes('GlobalThemePicker') || !compiled.includes('useGlobalTheme')) throw new Error('Bundle must include src/upgrade.tsx and global themes.');
let code = fs.readFileSync(path.join(original, jsName), 'utf8');
function replaceOnce(before, after) {
  if (code.split(before).length !== 2) throw new Error(`Expected exactly one patch location: ${before}`);
  code = code.replace(before, after);
}
const start = code.indexOf('function b3('), end = code.indexOf('function M3(', start);
if (start < 0 || end < 0) throw new Error('Unsupported baseline: Music component not found.');
code = code.slice(0, start) + compiled + '\nfunction b3({providers:U,onGoProviders:Q}){return i.createElement(BOSMusicUpgrade.MusicStudio,{providers:U,onGoProviders:Q})}\n' + code.slice(end);
replaceOnce('function A3(){', 'function A3(){const bosGlobalTheme=BOSMusicUpgrade.useGlobalTheme();');
replaceOnce('[Nl,_l]=i.useState(!1);i.useEffect', '[Nl,_l]=i.useState(!1);const bosAutomation=BOSMusicUpgrade.useScriptAutomation(x);i.useEffect');
replaceOnce('d==="providers"&&s.jsxs("section",{className:"provider-stack"', 'd==="providers"&&s.jsx(BOSMusicUpgrade.UsageGuide,{}),d==="providers"&&s.jsx(BOSMusicUpgrade.GlobalThemePicker,{}),d==="providers"&&s.jsxs("section",{className:"provider-stack"');
replaceOnce('d==="workspace"&&s.jsx(z3,{models:Zl,onNavigate:T})', 'd==="workspace"&&s.jsx(z3,{models:Zl,onNavigate:T,providers:x,automation:bosAutomation})');
replaceOnce('{id:"providers",label:"模型与连接",sub:"配置供应商与模型",Icon:Ec}', '{id:"providers",label:"接口与主题",sub:"API 配置 · 视觉主题",Icon:Ec}');
replaceOnce('s.jsxs("div",{className:"sidebar-foot",children:[s.jsx("div",{className:"side-rule"}),s.jsx("p",{children:"多重协议 · 一站接入"}),s.jsxs("p",{className:"muted",children:["让全球的模型能力",s.jsx("br",{}),"为你的创意所用。"]}),s.jsxs("div",{className:"local-mode",children:[s.jsx("span",{className:"status-dot"})," 本机 API 代理"]})]})', 's.jsx(BOSMusicUpgrade.SidebarCredits,{})');
replaceOnce('{id:"workspace",label:"工作空间",sub:"我的创作与灵感",Icon:P8}]', '{id:"workspace",label:"工作空间",sub:"字幕 · 曲库 · 配乐队列",Icon:P8},{id:"jianying",label:"剪映自动化",sub:"导出 · 字幕 · 改名 · 水印",Icon:P8},{id:"webai",label:"国内 AI",sub:"DeepSeek · 豆包免 Key",Icon:P8}]');
replaceOnce('workspace:{eyebrow:"工作空间"', 'webai:{eyebrow:"WEB AI STUDIO",title:"国内 AI 免密工作台",description:"内嵌 DeepSeek 与豆包官方网页，登录账号即可协同分析剧本与生成提示词。"},jianying:{eyebrow:"JIANYING AUTOMATION",title:"剪映自动化与样片水印",description:"无人值守草稿批量导出、SRT 字幕提取、AI 视频批量改名与原版红薯样片硬件加速水印合成。"},watermark:{eyebrow:"NATIVE HW WATERMARK",title:"样片批量水印",description:"基于 Windows Media Foundation 原生 C# 硬件加速引擎，高速批量合成红薯样片水印。"},workspace:{eyebrow:"WORKSPACE"');
replaceOnce('d==="workspace"&&s.jsx(z3,{models:Zl,onNavigate:T,providers:x,automation:bosAutomation})', 'd==="workspace"&&s.jsx(z3,{models:Zl,onNavigate:T,providers:x,automation:bosAutomation}),s.jsx(BOSMusicUpgrade.JianyingStudio,{active:d==="jianying"||d==="watermark",providers:x,onNavigate:T}),s.jsx(BOSMusicUpgrade.WebAIStudio,{active:d==="webai",providers:x,automation:bosAutomation,onNavigate:T})');
replaceOnce('className:`app-shell ${d==="chat"?"chat-open":""}`', 'className:`app-shell ${d==="chat"?"chat-open":d==="music"?"music-open":d==="webai"?"webai-open":""}`,"data-bos-theme":bosGlobalTheme');
replaceOnce('function z3({models:d,onNavigate:T})', 'function BOSOriginalWorkspace({models:d,onNavigate:T})');
replaceOnce('Ys.createRoot(document.getElementById("root"))', 'function z3(props){return i.createElement("section",{className:"bos-workspace"},i.createElement(BOSMusicUpgrade.ScriptAutomation,props))}\nYs.createRoot(document.getElementById("root"))');
replaceOnce('最近使用的模型、对话和音乐创作都在这里继续。', '自动提取对白字幕、匹配本地曲库与管理 Suno 异步配乐队列。');
code = code.replace('if(!w.preview)throw new Error', 'if(!w.preview&&!w.ok)throw new Error');
code = code.replace('title:"让灵感发出声音",description:"选择已接入的音乐生成模型，描述你想听到的场景与情绪，直接通过中转站发起创作。"', 'title:"灵感编曲室",description:"定制流派质感与段落起承转合，一键合成完整配乐。"');
code = code.replace('{value:"gemini",label:"Gemini Generative"},{value:"custom",label:"自定义（OpenAI 兼容）"}],v3={openai:[],anthropic:[],gemini:[],custom:[]}', '{value:"gemini",label:"Gemini AI Studio（官方免填地址）"},{value:"custom",label:"自定义（OpenAI 兼容）"},{value:"suno",label:"Suno 异步音乐"}],v3={openai:[],anthropic:[],gemini:["gemini-2.5-flash","gemini-2.5-pro","gemini-2.0-flash"],custom:[],suno:[]}');
replaceOnce(
  'return T}function A3(){',
  'if(!T.some(U=>U&&(U.id==="gemini-ai-studio"||U.protocol==="gemini")))T.unshift({id:"gemini-ai-studio",name:"Gemini AI Studio",description:"Google AI Studio 官方直连 · 无需填写 Base URL，直接填入 API Key 即可",protocol:"gemini",baseUrl:"https://generativelanguage.googleapis.com/v1beta",apiKey:"",models:["gemini-2.5-flash","gemini-2.5-pro"]});return T}function A3(){'
);
replaceOnce(
  's.jsxs("label",{className:"field-group",children:[s.jsx("span",{children:"Base URL"}),s.jsx("input",{"aria-label":`${d.name} Base URL`,value:d.baseUrl,onChange:q=>T({baseUrl:q.target.value}),spellCheck:"false",placeholder:"https://your-gateway.example/v1"})]})',
  'd.protocol!=="gemini"&&s.jsxs("label",{className:"field-group",children:[s.jsx("span",{children:"Base URL"}),s.jsx("input",{"aria-label":`${d.name} Base URL`,value:d.baseUrl,onChange:q=>T({baseUrl:q.target.value}),spellCheck:"false",placeholder:"https://your-gateway.example/v1"})]})'
);
replaceOnce(
  'disabled:j||!X||!((Il=d.baseUrl)!=null&&Il.trim())||!((Bl=d.apiKey)!=null&&Bl.trim())',
  'disabled:j||!X||(d.protocol!=="gemini"&&!((Il=d.baseUrl)!=null&&Il.trim()))||!((Bl=d.apiKey)!=null&&Bl.trim())'
);
replaceOnce(
  'const dl=v.trim()||"自定义中转站";T({id:`provider-${Date.now()}`,name:dl,description:"自定义服务 · 独立协议配置",protocol:U,baseUrl:Y.trim(),',
  'const dl=v.trim()||(U==="gemini"?"Gemini AI Studio":"自定义中转站");T({id:`provider-${Date.now()}`,name:dl,description:U==="gemini"?"Google AI Studio 官方直连 · 免填 Base URL":"自定义服务 · 独立协议配置",protocol:U,baseUrl:U==="gemini"?(Y.trim()||"https://generativelanguage.googleapis.com/v1beta"):Y.trim(),'
);
replaceOnce(
  's.jsxs("label",{children:["Base URL",s.jsx("input",{required:!0,value:Y,onChange:W=>_(W.target.value),placeholder:U==="anthropic"?"https://api.anthropic.com/v1":U==="gemini"?"https://generativelanguage.googleapis.com/v1beta":"https://api.openai.com/v1"})]})',
  'U!=="gemini"&&s.jsxs("label",{children:["Base URL",s.jsx("input",{required:!0,value:Y,onChange:W=>_(W.target.value),placeholder:U==="anthropic"?"https://api.anthropic.com/v1":U==="gemini"?"https://generativelanguage.googleapis.com/v1beta":"https://api.openai.com/v1"})]})'
);
replaceOnce(
  'window.localStorage.setItem(u6,JSON.stringify(x))',
  'window.localStorage.setItem(u6,JSON.stringify(x));window.localStorage.setItem("xm.providers.cache",JSON.stringify(x))'
);
code = code.replaceAll('黑曜信号台', 'XM剪辑台');
fs.writeFileSync(path.join(root, 'dist/client/assets/music-studio.js'), code);
// Replace the original decorative rail with functional local shortcuts.
const railStart = code.indexOf('s.jsxs("aside",{className:"inspiration-rail"');
const railEnd = code.indexOf(',R&&s.jsx(S3', railStart);
if (railStart < 0 || railEnd < 0) throw new Error('Right sidebar patch location changed.');
code = code.slice(0, railStart) + 's.jsx(BOSMusicUpgrade.TitleBar,{onNavigate:T}),s.jsx(BOSMusicUpgrade.SidebarResizer,{})' + code.slice(railEnd);
fs.writeFileSync(path.join(root, 'dist/client/assets/music-studio.js'), code);
const css = [fs.readFileSync(path.join(original, cssName), 'utf8'), fs.readFileSync(path.join(root, 'src/music-studio.css'), 'utf8'), fs.readFileSync(path.join(root, 'src/global-themes.css'), 'utf8'), fs.readFileSync(path.join(root, 'src/script-automation.css'), 'utf8')].join('\n');
fs.writeFileSync(path.join(root, 'dist/client/assets/music-studio.css'), css);
const version = createHash('sha256').update(code).update(css).digest('hex').slice(0, 12);
let html = fs.readFileSync(path.join(original, 'index.html'), 'utf8').replace(jsName, `music-studio.js?v=${version}`).replace(cssName, `music-studio.css?v=${version}`).replaceAll('黑曜信号台', 'XM剪辑台');
fs.writeFileSync(path.join(root, 'dist/client/index.html'), html);
console.log('Built music-studio.js and music-studio.css');
