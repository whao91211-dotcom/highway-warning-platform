# 高速公路二次事故智能预警平台

> 基于 Vue Vben Admin 定制，面向高速公路二次事故预警场景的可视化监控平台。

## 项目背景

针对高速公路二次事故频发问题，基于国标 GB 45672-2025《车载事故紧急呼叫系统》，打通"车载感知 → 边缘计算 → 云端决策 → 多端分发"闭环架构。

前端可视化平台承担以下职责：

- **实时预警展示** — MQTT 订阅事故消息，Leaflet 地图实时标注 + 5km 预警扩散动画
- **AI 智能研判** — 接入 DeepSeek API，流式展示事故等级、救援建议、管制方案
- **系统监控看板** — 端到端延迟、边缘节点状态、事故统计等 ECharts 看板
- **精确定位可视化** — WGS-84 / GCJ-02 坐标对比、±3m 误差圈、Haversine 距离

## 功能模块

### 预警监控台 (`/warning`)

| 功能 | 说明 |
|------|------|
| 高德地图 | Leaflet + 高德瓦片，GCJ-02 坐标对齐 |
| 事故标注 | MQTT 实时推送事故位置，弹窗展示 MSD 详情 |
| 预警扩散 | 红色圆圈从事故点向外扩散至 5km，三层同心圆渐变 |
| 虚拟车辆 | 事故后方生成虚拟车辆，状态切换（蓝→黄闪烁→绿） |
| AI 研判 | DeepSeek 流式推理输出：事故等级、救援建议、管制方案 |
| 定位精度 | WGS-84（蓝点）vs GCJ-02（橙点）对比，±3m 误差圈 |

### 系统监控看板 (`/monitor`)

| 指标 | 图表 |
|------|------|
| 端到端延迟 | 折线图（标注 2000ms 设计目标线） |
| 边缘节点状态 | 状态卡片（在线/延迟/心跳） |
| 事故统计 | 按小时分布柱状图 + 动力类型饼图 |
| 系统可用性 | 消息接收/丢失量、丢包率 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3 + Vite + TypeScript |
| UI 组件库 | Ant Design Vue 4 |
| 地图 | Leaflet + @vue-leaflet/vue-leaflet + 高德瓦片 |
| 实时通信 | MQTT.js（WebSocket 接入 Mosquitto） |
| 图表 | ECharts 6 |
| 坐标转换 | coordtransform（WGS-84 ↔ GCJ-02） |
| 状态管理 | Pinia |
| AI | DeepSeek API（流式推理） |
| 包管理 | pnpm monorepo + Turbo |

## 项目结构

```
├── apps/
│   ├── web-antd/                      # 前端应用
│   │   └── src/
│   │       ├── views/
│   │       │   ├── warning/           # 预警监控台（Leaflet 地图）
│   │       │   │   ├── index.vue
│   │       │   │   └── composables/   # useMqtt / useMockData /
│   │       │   │                       useCoordTransform / useWarningAnimation
│   │       │   │                       useAiAnalysis
│   │       │   └── monitor/           # 系统监控看板（ECharts）
│   │       │       ├── index.vue
│   │       │       └── composables/   # useMonitorData
│   │       └── router/routes/modules/ # 路由（glob 自动发现）
│   │           ├── warning.ts         # /warning → 预警监控台
│   │           └── monitor.ts         # /monitor → 系统监控看板
│   └── backend-mock/                  # Nitro mock API（DeepSeek 代理）
├── packages/                          # 共享框架包（@vben/*）
├── internal/                          # 构建/校验配置
└── scripts/                           # 工具脚本
```

## 快速开始

**环境要求：** Node.js `^20.19 || ^22.18 || ^24`，pnpm `>=10.0`

```bash
# 安装依赖
pnpm install

# 启动开发服务器（端口 5666）
pnpm dev:antd

# 生产构建
pnpm build:antd

# 类型检查
pnpm check:type

# 代码校验 / 格式化
pnpm lint
pnpm format

# 单元测试
pnpm test:unit
```

## 环境变量

在 `apps/web-antd/.env.development` 中配置：

| 变量 | 说明 |
|------|------|
| `VITE_APP_TITLE` | 应用标题 |
| `VITE_PORT` | 开发服务器端口（默认 5666） |
| `VITE_GLOB_API_URL` | API 地址（代理到 backend-mock） |
| `VITE_MQTT_BROKER` | MQTT WebSocket URL |

## MQTT 接口约定

```
accident/{vehicleId}/msd       # 事故 MSD 原始数据
accident/{vehicleId}/warning   # 预警推送消息
edge/{nodeId}/status           # 边缘节点心跳
ai/{accidentId}/analysis       # DeepSeek 研判结果（流式）
```

MSD 数据字段：

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

## 开发约定

- 提交规范：Angular 风格（`feat` / `fix` / `docs` / `refactor` 等）
- 交互式提交：`pnpm commit`
- 仅使用 `web-antd` 应用，不引入其他 UI 框架变体

## License

MIT
