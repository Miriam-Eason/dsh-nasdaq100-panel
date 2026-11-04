# dsh-nasdaq100-panel

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）Web GUI 提供的**纳斯达克100指数（NDX100）看板插件**：实时行情快照、多区间历史走势，以及趋势 / 动能 / 波动率 / 回撤 / 成交量 / 季节效应等指标的通俗解读。

面板跟随 Harness 中英文界面与明暗主题，数据来自东方财富公开行情接口（延迟行情、无需 API Key）。

## 功能

- **行情快照**：最新点位、涨跌额 / 涨跌幅、今开、最高、最低、昨收、成交量、52 周区间。
- **市场状态**：按美东时间自动判断盘前 / 盘中 / 盘后 / 休市，显示数据截至日期。
- **历史走势图**：1月 / 3月 / 6月 / 今年 / 1年 / 3年 / 5年 / 全部 切换；收盘价面积图 + MA50 均线；悬停显示日期、收盘价、涨跌幅、MA50。
- **综合解读 + 9 张指标卡**，每个指标都带一句通俗结论：

  | 指标 | 内容 |
  | --- | --- |
  | 趋势 | 价格与 MA20 / MA50 / MA200 的相对位置、均线多空排列、金叉 / 死叉 |
  | 动能 | RSI(14) 强弱区间、近 1 月 / 3 月收益 |
  | 收益 | 1M / 3M / 6M / 今年以来 / 1年 / 3年·5年年化 |
  | 波动率 | 20 日 / 60 日年化波动率，波动放大还是收敛 |
  | 回撤 | 距历史最高收盘、历史最大回撤、近一年最大回撤 |
  | 52 周区间 | 区间高低点、当前分位（进度条） |
  | 成交量 | 最新成交量、20 日均量、量比、5 日/20 日均量对比 |
  | 季节效应 | 当前自然月历史平均收益与上涨概率（样本有限） |
  | 宏观参考 | 美元指数及其对科技成长股估值的含义 |

- **自动刷新**：默认 60 秒轮询（可开关），支持手动刷新；刷新失败时保留上次数据并提示。
- 无构建步骤、无第三方运行时依赖（浏览器端仅使用 React 基线模块）。

## 安装

要求：DSH Desktop 或 Web profile（需要 Web 服务器与 Web GUI 客户端插件树），Node.js 22+。

```bash
git clone https://github.com/Miriam-Eason/dsh-nasdaq100-panel.git
```

然后在 Harness 中把该目录安装为插件：

1. 在会话中让 Agent 通过 **Plugin Manager** 安装该目录（`install_bundle`，target 为该目录的绝对路径）；或
2. 在 Harness 的插件管理界面选择安装本地插件目录。

安装会写入当前 profile（默认 `desktop`）并随重启保留。安装成功后：

- 左侧边栏会新增一个**走势图小图标**（位于「Plugins / 自动化任务」入口下方）；
- 点击该图标，中央主面板打开「纳斯达克100指数」看板；
- 若图标未出现，刷新一次页面。

卸载：在插件管理中移除 `@local/nasdaq100-panel`。

## 数据来源与指标口径

- **行情源**：东方财富 `push2` 接口，指数代码 `100.NDX100`（即纳斯达克100；东财的 `NDX` 是纳斯达克综合指数，二者不同）。行情为**延迟行情**。
- **历史数据**：日线，始于 2019-04-08（上游可提供的最早日期）。
- **缓存**：报价 20 秒、历史 5 分钟；浏览器端默认 60 秒轮询。
- **指标口径**：

  | 指标 | 说明 |
  | --- | --- |
  | MA20 / MA50 / MA200 | 日线收盘价的简单移动平均 |
  | 金叉 / 死叉 | 最近 90 个交易日内 MA50 与 MA200 的交叉方向 |
  | RSI(14) | Wilder 平滑；≥70 超买，≤30 超卖 |
  | 区间收益 | 1M/3M/6M/1Y 分别按 21/63/126/252 个交易日计算；3Y、5Y 为年化收益 |
  | 今年以来 | 相对上一年度最后一个交易日收盘价 |
  | 波动率 | 日对数收益标准差 × √252，窗口 20 / 60 个交易日 |
  | 回撤 | 距历史最高**收盘价**；历史最大回撤；近一年（252 交易日）最大回撤 |
  | 52 周区间 | 最近 252 个交易日的**盘中**最高 / 最低，分位 =（现价 − 低）/（高 − 低） |
  | 成交量 | 最新成交量与 20 日均量的比值；5 日均量 / 20 日均量 |
  | 季节效应 | 按自然月统计历史月收益均值与上涨概率，样本自 2019 年起，样本量有限 |

> 以上解读由技术指标规则生成，仅供研究参考，**不构成任何投资建议**。

## 数据接口

插件 Host 半在 Harness 的 Web 载体上注册一个只读同源路由：

```text
GET /dsh-nasdaq100/data?range=1y
```

`range` 取值：`1m` `3m` `6m` `ytd` `1y` `3y` `5y` `max`（非法值回退 `1y`）。

返回 JSON 主要字段：

| 字段 | 含义 |
| --- | --- |
| `quote` | 最新价、开高低收、涨跌额 / 涨跌幅（百分点）、成交量、更新时间 |
| `marketStatus` | `pre` / `open` / `post` / `closed`（美东时间估算，不含节假日日历） |
| `series.points` | 图表序列 `[时间戳, 收盘价, MA50]`，按区间下采样 |
| `metrics` | 均线、RSI、收益、波动率、回撤、52 周区间、成交量、季节效应、趋势评分 |
| `macro` | 美元指数点位与日涨跌（百分点） |
| `meta` | 刷新间隔、历史起始日、数据是否陈旧等 |

该路由只返回公开行情数据，不读取任何会话、工作区或凭据信息。

## 文件结构

```text
.
├── package.json        # DSH bundle 清单（dsh.bundle.patch + dsh.client）
├── cordis.patch.yml    # 向 Loader 插入 @local/nasdaq100-panel 行
├── index.js            # Host 半：注册只读行情路由
├── data.js             # Host 数据层：东财抓取、缓存、指标计算
├── client.js           # 浏览器半：侧边栏图标 + 主面板 UI / 图表 / 解读
├── locale/
│   ├── en.json         # 插件展示元数据（英文）
│   └── zh.json         # 插件展示元数据（中文）
└── icon.svg            # 插件图标
```

## 开发

- 无构建步骤：`client.js` 以纯 JavaScript 通过 DSH Client 模块加载器注册，`index.js` / `data.js` 为原生 ESM。
- 可调参数集中在 `data.js` 顶部（上游地址、缓存 TTL、图表最大点数等），区间列表与文案在 `client.js` 中。
- 修改 `client.js` 后，正在打开的页面通常可在 HMR 下即时生效；修改 Host 半（`index.js` / `data.js`）需要重启 Harness 或重新加载插件后生效。

## 已知限制

- 行情为延迟数据，不保证与交易所实时一致。
- 市场状态按美东时间估算，**未内置美国节假日日历**，节假日可能显示为盘前/盘中。
- 历史数据自 2019-04-08 起；季节效应样本量有限。
- 指标解读是规则化文案，不预测行情。

## English

A DeepSeek Harness Web GUI plugin that shows the Nasdaq-100 index (NDX100): live quote snapshot, multi-range history chart with MA50, and plain-language interpretation of trend, momentum, volatility, drawdown, 52-week range, volume, seasonality and the US Dollar Index. Data comes from Eastmoney's public delayed feed (no API key). Install the directory as a DSH bundle via Plugin Manager; a chart icon appears in the sidebar and opens the dashboard as a main panel. Metrics are derived from daily closes and are for research reference only, not investment advice.
