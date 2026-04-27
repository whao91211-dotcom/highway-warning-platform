# 高速公路二次事故智能预警平台 — 前端开发计划

> 负责模块：精确定位 + 可视化平台前端  
> 技术底座：vue-vben-admin (web-antd) + Leaflet + MQTT.js + ECharts  
> 开发环境：Windows + VSCode + Claude Code

---

## 一、项目背景

本系统针对高速公路二次事故问题，基于国标 GB 45672-2025《车载事故紧急呼叫系统》，打通"车载感知 → 边缘计算 → 云端决策 → 多端分发"闭环架构。

前端可视化平台承担以下职责：

- 实时订阅 MQTT 消息，展示事故位置与预警范围
- 呈现 AI 接线员（DeepSeek）研判结果
- 展示端到端延迟、边缘节点状态等系统指标
- 作为比赛答辩的核心演示界面

---

## 二、技术栈

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 框架 | Vue 3 + Vite + TypeScript | vben-admin monorepo，应用在 `apps/web-antd` |
| UI 组件 | Ant Design Vue | vben-admin 内置 |
| 地图 | Leaflet + @vue-leaflet/vue-leaflet | 轻量，支持自定义图层 |
| 地图瓦片 | 高德地图 AutoNavi | 已切换，全链路 GCJ-02 坐标适配 |
| 实时通信 | MQTT.js（WebSocket 接入） | 对接 Mosquitto broker，端口 9001 |
| 数据可视化 | ECharts 5 | 延迟折线图、事故统计图 |
| 坐标转换 | coordtransform | WGS-84 → GCJ-02 |
| 状态管理 | Pinia（vben 内置） | 跨组件共享事故数据 |

---

## 三、已完成工作

### ✅ 阶段一：路由与基础联调

- 在 `router/routes/modules/` 下新建 `warning.ts` 注册路由
- glob 自动发现路由，左侧菜单添加"预警监控台"入口
- 页面可通过 `/warning` 路径正常访问
- MQTT topic 和 MSD payload 字段约定已文档化（后端联调待后续进行）

### ✅ 阶段二：预警动画与虚拟车辆

- 预警扩散动画：红色圆圈从事故点向外扩散至 5km
- 后方虚拟车辆：在事故点后方生成若干虚拟车辆标注点
- 车辆状态变化：未预警（蓝色）→ 收到预警（黄色闪烁）→ 已处理（绿色）
- 动画与 MQTT 消息联动

### ✅ 阶段三：系统监控看板

新建页面 `views/monitor/index.vue` + composable `useMonitorData.js`：

- 端到端延迟折线图（ECharts），标注 2000ms 设计目标线
- 边缘节点状态卡片（在线状态、延迟、心跳）
- 今日事故统计（总数、按小时分布柱状图、动力类型饼图）
- 系统可用性指标（消息接收/丢失、丢包率）
- ECharts 改用全量导入（`import * as echarts from 'echarts'`），解决 tree-shaking 致空白问题

### ✅ 阶段四：AI 研判结果展示

新建 composable `useAiAnalysis.js`：

- 事故详情面板下方 AI 分析区域
- 流式文字输出效果（逐字显示，模拟 DeepSeek 推理过程）
- 结构化展示：事故等级（一级/二级/三级）、救援力量建议、交通管制方案
- 本地规则兜底（当 AI 服务不可用时自动切换）

### ✅ 阶段五：精确定位可视化

新建 composable `useCoordTransform.js`：

- WGS-84（蓝色小点）vs GCJ-02（橙色大点）对比标注
- ±3m 误差圈展示定位精度
- Haversine 距离计算，显示坐标偏移量
- 5km 影响范围渐变色展示（三层同心圆）
- coordtransform 库封装

### ✅ 阶段六：UI 打磨与答辩准备（进行中）

**已完成：**

- **高德地图迁移**：瓦片从 OSM 切换为高德 `webrd{s}.is.autonavi.com`，所有事故标注/动画/虚拟车辆坐标转为 GCJ-02 以正确对齐
- **品牌去 Vben 化**：
  - 应用标题改为"高速公路二次事故智能预警平台"
  - 删除原 Vben 演示页面路由（概览/演示/项目/关于），侧边栏仅保留预警监控台和系统监控看板
  - 清理用户下拉菜单中的 Vben 文档/GitHub/问答链接
  - 替换演示通知为项目相关内容
- **投影仪适配**：全局字体放大 1-2px，侧边面板宽度 300→340px，图表高度增加
- **顶栏美化**：渐变背景 + 彩色底边 + 脉冲状态动画 + 版本标签
- **环境隔离**：`.env.development` 加入 `.gitignore`，根目录和 app 目录各司其职
- **bug 修复**：
  - 高德瓦片子域名格式错误致地图空白（`webrd0{s}` → `webrd{s}` + subdomains 参数）
  - `defaultHomePath` 被 localStorage 旧缓存覆盖导致页面 404（加入 `updatePreferences` 显式覆写）

**待完成：**

- 录制演示视频（备用，防现场网络问题）
- 打包验证（`pnpm build:antd`），部署到演示服务器

### ✅ Git 仓库整理

- master 分支压缩为 5 个里程碑提交，历史干净线性
- 建立分支策略：`feat-stage6-optimization`（阶段六开发）、`fix/monitor-blank`（bug 修复）
- 原完整历史保留在 `archive/full-history-backup`

---

## 四、待完成工作

> 阶段一 ~ 阶段五已全部完成。阶段六 UI 打磨主体完成，剩余答辩准备。

### 阶段六：UI 打磨与答辩准备（优先级：🟢 中）

- [x] 替换地图瓦片为高德（含 GCJ-02 坐标全链路适配）
- [x] 品牌去 Vben 化（标题、菜单、下拉、通知）
- [x] 响应式布局适配（答辩投影仪分辨率）
- [x] 顶栏美化（渐变背景 + 动画 + 版本标签）
- [x] 环境隔离配置（.env.development gitignore）
- [x] Git 仓库规范化（里程碑压缩、分支策略）
- [ ] 录制演示视频（备用，防现场网络问题）
- [ ] 生产打包验证（`pnpm build:antd`）与部署

### MQTT 后端联调（待后端正）

| 事项                     | 状态      |
| ------------------------ | --------- |
| Mosquitto WebSocket 端口 | 🔲 待确认 |
| MQTT topic 命名规范      | 🔲 待确认 |
| MSD payload JSON 字段名  | 🔲 待确认 |
| AI 分析结果推送方式      | 🔲 待确认 |
| 边缘节点心跳格式         | 🔲 待确认 |
| 演示服务器 IP            | 🔲 待确认 |

---

## 五、目录结构（当前状态）

```
apps/web-antd/src/
├── views/
│   ├── warning/
│   │   ├── index.vue                    # ✅ 主监控台页面（高德瓦片 + GCJ-02）
│   │   └── composables/
│   │       ├── useMqtt.js               # ✅ MQTT 通信
│   │       ├── useMockData.js           # ✅ Mock 数据模拟
│   │       ├── useCoordTransform.js     # ✅ 坐标转换（WGS84↔GCJ02）
│   │       ├── useWarningAnimation.js   # ✅ 预警扩散动画 + 虚拟车辆
│   │       └── useAiAnalysis.js         # ✅ AI 流式研判
│   └── monitor/
│       ├── index.vue                    # ✅ 系统监控看板
│       └── composables/
│           └── useMonitorData.js        # ✅ 监控数据模拟
├── router/routes/modules/
│   ├── warning.ts                       # ✅ 预警监控台路由
│   ├── monitor.ts                       # ✅ 系统监控看板路由
│   └── profile.ts                       # ✅ 个人中心路由（隐藏菜单）
├── layouts/
│   └── basic.vue                        # ✅ 已清理 Vben 品牌残留
├── main.ts                              # ✅ 强制覆写缓存配置
├── preferences.ts                       # ✅ defaultHomePath 覆盖
├── .env                                 # ✅ 应用标题
├── .env.development                     # ✅ 开发环境变量（gitignored）
└── .env.production                      # ✅ 生产环境变量
```

---

## 六、与后端的接口约定（待联调）

| 事项                     | 状态      | 说明                           |
| ------------------------ | --------- | ------------------------------ |
| Mosquitto WebSocket 端口 | 🔲 待确认 | 前端需要 ws:// 接入，默认 9001 |
| MQTT topic 命名规范      | 🔲 待确认 | 见下方约定草案                 |
| MSD payload JSON 字段名  | 🔲 待确认 | 需与 `useMqtt.js` 中字段名对齐 |
| AI 分析结果推送方式      | 🔲 待确认 | MQTT 流式 or HTTP SSE          |
| 边缘节点心跳格式         | 🔲 待确认 | 节点ID、延迟、状态字段         |
| 演示服务器 IP            | 🔲 待确认 | 用于 `.env.production` 配置    |

**MQTT topic 约定草案：**

```
accident/{vehicleId}/msd       # 事故 MSD 原始数据
accident/{vehicleId}/warning   # 预警推送消息
edge/{nodeId}/status           # 边缘节点心跳状态
ai/{accidentId}/analysis       # DeepSeek 研判结果（流式）
```

**MSD payload 字段约定草案：**

```json
{
  "vehicleId": "粤A12345",
  "latitude": 45.756,
  "longitude": 126.642,
  "triggerTime": "2025-04-25T10:30:00Z",
  "deltaV": 45,
  "rolloverState": false,
  "powerType": "电动",
  "occupants": 2
}
```

---

## 七、工作量估算

| 模块                | 估计工时   | 状态        |
| ------------------- | ---------- | ----------- |
| 环境搭建 + 基础页面 | 1.5天      | ✅ 完成     |
| 路由注册 + 页面接入 | 0.5天      | ✅ 完成     |
| 预警动画            | 1天        | ✅ 完成     |
| 系统监控看板        | 0.5天      | ✅ 完成     |
| AI 研判展示         | 0.5天      | ✅ 完成     |
| 精确定位可视化      | 0.5天      | ✅ 完成     |
| UI 打磨 + 答辩准备  | 1天        | ✅ 主体完成 |
| MQTT 后端联调       | 1天        | 🔲 待后端   |
| **合计**            | **~6.5天** |             |

---

## 八、开发环境备忘

- 开发服务器：`pnpm dev:antd`（端口自动分配，默认 5666）
- 生产构建：`pnpm build:antd`
- 类型检查：`pnpm check:type`
- 单元测试：`pnpm test:unit`
- 代码规范：`pnpm lint` / `pnpm format`
- 交互式提交：`czg`（Angular 风格 commit message）
- 项目配置详见 `CLAUDE.md`

---

_文档生成时间：2026年4月25日_  
_最后更新：2026年4月27日_  
_当前进度：阶段一～五全部完成，阶段六主体完成（高德迁移、品牌清理、Git 规范化），剩余演示视频录制和生产部署验证_
