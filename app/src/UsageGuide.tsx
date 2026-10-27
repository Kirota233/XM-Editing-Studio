declare const i: any;

interface QuickTip {
  step: string;
  title: string;
  desc: string;
}

const QUICK_TIPS: QuickTip[] = [
  { step: '01', title: '网页与 API 双模驱动', desc: 'DeepSeek / 豆包网页版免 Key 登录即用；Suno 与 Gemini 支持标准 API 接入。' },
  { step: '02', title: '剧本台词与标点保护', desc: '自动提取中 / 英 / 西语台词，一键开启剪映标点保留并校验行数。' },
  { step: '03', title: '本地曲库与 Suno 配乐', desc: '支持整篇或 2–6 段情节分析，智能避开最近 10 首已用曲目，一键拖入剪映。' },
  { step: '04', title: '批量水印与剪映自动化', desc: '本地 WebAV 加速合成样片水印；剪映草稿支持批量导出、字幕工程与智能改名。' },
];

export function UsageGuide() {
  return (
    <section className="bos-usage" aria-label="软件使用说明">
      <details className="bos-usage-drawer">
        <summary className="bos-usage-top">
          <div className="bos-usage-brand">
            <span className="bos-script-eyebrow">QUICK START</span>
            <strong>工作台快速导览</strong>
          </div>
          <span className="bos-usage-pill">4 步核心工作流 · 点击展开 ⌄</span>
        </summary>
        <div className="bos-usage-grid">
          {QUICK_TIPS.map(item => (
            <div className="bos-usage-card" key={item.step}>
              <span className="bos-usage-step">{item.step}</span>
              <strong>{item.title}</strong>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
