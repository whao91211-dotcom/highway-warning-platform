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
| 地图瓦片 | OpenStreetMap（开发）/ 高德（生产） | 生产环境需处理 WGS84→GCJ02 坐标转换 |
| 实时通信 | MQTT.js（WebSocket 接入） | 对接 Mosquitto broker，端口 9001 |
| 数据可视化 | ECharts 5 | 延迟折线图、事故统计图 |
| 坐标转换 | coordtransform | WGS-84 → GCJ-02 |
| 状态管理 | Pinia（vben 内置） | 跨组件共享事故数据 |

---

## 三、已完成工作

### ✅ 环境搭建

- 克隆 vue-vben-admin，清理 git 历史，初始化为独立项目
- 安装业务依赖：`mqtt`、`leaflet`、`@vue-leaflet/vue-leaflet`、`coordtransform`
- 创建 `.env.development`，配置 MQTT broker 地址和平台标题
- 本地开发服务器正常运行（`localhost:5666`）

### ✅ 核心文件创建

以下文件已创建，位于 `apps/web-antd/src/views/warning/`：

```
views/warning/
├── index.vue                    # 主页面：地图 + 右侧事故列表 + 详情卡片
└── composables/
    ├── useMqtt.js               # MQTT 连接管理，消息解析，事故数据维护
    └── useMockData.js           # Mock 数据模拟器，每4秒生成一条模拟事故
```

**index.vue 已实现功能：**

- 暗色主题布局（顶部状态栏 + 地图区 + 右侧面板）
- MQTT 连接状态实时显示
- 地图上橙色圆点标注事故位置
- 点击事故点：地图聚焦 + 5km 预警范围圈展示
- 右侧事故详情卡片（ΔV、动力类型、人数、翻滚状态、坐标、时间）
- 右侧事故列表，支持点击联动地图
- Mock 数据开关按钮，可独立于后端测试

### ✅ 已完成（2026/4/25）

- 路由注册 — 创建 `warning.ts`，修复 composables 目录和 import 别名
- 页面可通过 `/warning` 路径正常访问

---

## 四、待完成工作

### 阶段一：路由与基础联调（优先级：🔴 最高）

- [x] 在 `router/routes/modules/` 下新建 `warning.ts` 注册路由
- [x] 在 `router/routes/index.ts` 中引入并挂载路由（glob 自动发现）
- [x] 在左侧菜单中添加"预警监控台"导航入口
- [x] 验证页面可通过 `/warning` 路径正常访问
- [ ] 与后端确认 MQTT topic 命名规范和 MSD payload 字段格式

**MQTT topic 约定（待与后端确认）：**

```
accident/{vehicleId}/msd       # 事故 MSD 原始数据
accident/{vehicleId}/warning   # 预警推送消息
edge/{nodeId}/status           # 边缘节点心跳状态
ai/{accidentId}/analysis       # DeepSeek 研判结果（流式）
```

**MSD payload 字段约定（待确认）：**

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

### 阶段二：预警动画（优先级：🟡 高）

- [x] 实现预警扩散动画：事故触发后，红色圆圈从事故点向外扩散至 5km
- [x] 模拟后方车辆：在事故点后方生成若干虚拟车辆标注点
- [x] 车辆状态变化动画：未预警（蓝色）→ 收到预警（黄色闪烁）→ 已处理（绿色）
- [x] 动画与 MQTT 消息联动（收到真实消息时自动触发）

**实现思路：**

```javascript
// 用 setInterval 模拟扩散，每帧扩大半径
function playWarningAnimation(accidentPoint) {
  let radius = 0;
  const timer = setInterval(() => {
    radius += 150;
    updateCircle(radius);
    markWarnedCars(accidentPoint, radius);
    if (radius >= 5000) clearInterval(timer);
  }, 50);
}
```

---

### 阶段三：系统监控看板（优先级：🟡 高）

新建页面 `views/monitor/index.vue`，展示：

- [x] **端到端延迟折线图**（ECharts）：实时显示每条消息的延迟，标注 2000ms 设计目标线
- [x] **边缘节点状态卡片**：节点 ID、在线状态、最近心跳时间、本地响应延迟（≤50ms）
- [x] **今日事故统计**：总数、按小时分布柱状图、动力类型饼图
- [x] **系统可用性指标**：MQTT 连接时长、消息接收总数、丢包率

---

### 阶段四：AI 研判结果展示（优先级：🟢 中）

- [ ] 在事故详情面板下方添加 AI 分析区域
- [ ] 支持流式文字输出效果（逐字显示，模拟 DeepSeek 推理过程）
- [ ] 结构化展示：事故等级、救援力量建议、交通管制方案
- [ ] 本地规则兜底显示（当 AI 服务不可用时）

---

### 阶段五：精确定位可视化（优先级：🟢 中）

对应负责的精确定位模块，在地图上可视化展示：

- [ ] 原始 GNSS 点（WGS-84，蓝色小点）vs 地图匹配后点（GCJ-02，橙色大点）对比
- [ ] ±3 米误差圈（极小半径圆，展示定位精度）
- [ ] Haversine 计算的 5km 影响范围渐变色展示
- [ ] 坐标转换工具函数完善（`coordtransform` 封装为 `useCoordTransform.js`）

---

### 阶段六：UI 打磨与答辩准备（优先级：🟢 中）

- [ ] 替换地图瓦片为高德（生产环境，坐标转换已就绪后）
- [ ] 添加平台 Logo 和标题美化
- [ ] 响应式布局适配（答辩投影仪分辨率适配）
- [ ] 录制演示视频（备用，防现场网络问题）
- [ ] 打包为静态文件（`pnpm build`），部署到演示服务器

---

## 五、目录结构规划

```
apps/web-antd/src/
├── views/
│   ├── warning/
│   │   ├── index.vue                 # ✅ 主监控台页面
│   │   └── composables/
│   │       ├── useMqtt.js            # ✅ MQTT 通信
│   │       ├── useMockData.js        # ✅ Mock 数据模拟
│   │       ├── useCoordTransform.js  # 🔲 坐标转换
│   │       └── useWarningAnimation.js # ✅ 预警动画
│   └── monitor/
│       ├── index.vue                 # ✅ 系统监控看板
│       └── composables/
│           └── useMonitorData.js     # ✅ 监控数据模拟
├── router/
│   └── routes/
│       └── modules/
│           └── warning.ts            # ✅ 路由注册
└── .env.development                  # ✅ 环境变量
```

---

## 六、与后端的接口约定清单

在开始联调前需与后端团队确认：

| 事项                     | 状态      | 说明                           |
| ------------------------ | --------- | ------------------------------ |
| Mosquitto WebSocket 端口 | 🔲 待确认 | 前端需要 ws:// 接入，默认 9001 |
| MQTT topic 命名规范      | 🔲 待确认 | 见阶段一约定草案               |
| MSD payload JSON 字段名  | 🔲 待确认 | 需与 `useMqtt.js` 中字段名对齐 |
| AI 分析结果推送方式      | 🔲 待确认 | MQTT 流式 or HTTP SSE          |
| 边缘节点心跳格式         | 🔲 待确认 | 节点ID、延迟、状态字段         |
| 演示服务器 IP            | 🔲 待确认 | 用于 `.env.production` 配置    |

---

## 七、工作量估算

| 模块                | 估计工时   | 状态      |
| ------------------- | ---------- | --------- |
| 环境搭建 + 基础页面 | 1.5天      | ✅ 完成   |
| 路由注册 + 页面接入 | 0.5天      | ✅ 完成   |
| MQTT 后端联调       | 1天        | 🔲 待开始 |
| 预警动画            | 1天        | ✅ 完成   |
| 系统监控看板        | 0.5天      | ✅ 完成   |
| AI 研判展示         | 0.5天      | 🔲 待开始 |
| 精确定位可视化      | 0.5天      | 🔲 待开始 |
| UI 打磨 + 答辩准备  | 1天        | 🔲 待开始 |
| **合计**            | **~6.5天** |           |

---

## 八、Claude Code 使用建议

在本地 Claude Code 中继续开发时，建议按以下方式提问：

- **完成路由注册**：「帮我查看 `router/routes/index.ts` 内容，然后把 warning 路由注册进去」
- **实现预警动画**：「在 `useWarningAnimation.js` 中实现5km预警扩散动画，用 Leaflet Circle 实现」
- **接入真实MQTT**：「后端 broker 地址是 ws://xxx，topic 格式是 xxx，帮我更新 useMqtt.js」
- **调试问题**：直接把报错信息粘贴给 Claude Code，它可以直接读取和修改本地文件

---

_文档生成时间：2026年4月25日_  
_当前进度：基础框架完成，路由注册完成，预警动画完成，系统监控看板完成，进入阶段四开发_
