<script setup>
import { onMounted, onUnmounted, watch } from 'vue';

import * as echarts from 'echarts';

import { useMonitorData } from './composables/useMonitorData';

const {
  delaySeries,
  edgeNodes,
  accidentStats,
  systemMetrics,
  DELAY_TARGET,
  startMock,
} = useMonitorData();

let delayChart = null;
let barChart = null;
let pieChart = null;

function initDelayChart() {
  const el = document.querySelector('#delay-chart');
  if (!el) return;
  delayChart = echarts.init(el);
  updateDelayChart();
}

function initBarChart() {
  const el = document.querySelector('#bar-chart');
  if (!el) return;
  barChart = echarts.init(el);
  updateBarChart();
}

function initPieChart() {
  const el = document.querySelector('#pie-chart');
  if (!el) return;
  pieChart = echarts.init(el);
  updatePieChart();
}

function updateDelayChart() {
  if (!delayChart) return;
  const times = delaySeries.value.map((d) => d.time);
  const values = delaySeries.value.map((d) => d.value);
  delayChart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: times,
      axisLine: { lineStyle: { color: '#1e3a5f' } },
      axisLabel: { color: '#78909c', fontSize: 10, interval: 5 },
    },
    yAxis: {
      type: 'value',
      name: 'ms',
      axisLine: { lineStyle: { color: '#1e3a5f' } },
      axisLabel: { color: '#78909c', fontSize: 10 },
      splitLine: { lineStyle: { color: '#132340' } },
    },
    tooltip: { trigger: 'axis' },
    series: [
      {
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: '#4fc3f7', width: 2 },
        itemStyle: { color: '#4fc3f7' },
        areaStyle: { color: 'rgba(79,195,247,0.08)' },
        markLine: {
          silent: true,
          symbol: 'none',
          label: {
            color: '#ff5252',
            fontSize: 10,
            formatter: `${DELAY_TARGET}ms 目标`,
          },
          lineStyle: { color: '#ff5252', type: 'dashed', width: 1 },
          data: [{ yAxis: DELAY_TARGET }],
        },
      },
    ],
  });
}

function updateBarChart() {
  if (!barChart) return;
  const hours = Array.from({ length: 24 }, (_, i) => `${i}`);
  barChart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 40, right: 10, top: 20, bottom: 25 },
    xAxis: {
      type: 'category',
      data: hours,
      axisLabel: { color: '#78909c', fontSize: 9, interval: 2 },
      axisLine: { lineStyle: { color: '#1e3a5f' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#78909c', fontSize: 9 },
      splitLine: { lineStyle: { color: '#132340' } },
    },
    tooltip: { trigger: 'axis', formatter: '{b}时: {c} 起' },
    series: [
      {
        type: 'bar',
        data: accidentStats.hourly,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#4fc3f7' },
            { offset: 1, color: '#0d47a1' },
          ]),
          borderRadius: [3, 3, 0, 0],
        },
      },
    ],
  });
}

function updatePieChart() {
  if (!pieChart) return;
  const { electric, fuel } = accidentStats.powerTypes;
  pieChart.setOption({
    backgroundColor: 'transparent',
    legend: {
      orient: 'horizontal',
      bottom: 0,
      textStyle: { color: '#78909c', fontSize: 10 },
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '74%'],
        center: ['50%', '45%'],
        label: { color: '#b0bec5', fontSize: 10 },
        data: [
          { value: electric, name: '电动', itemStyle: { color: '#69f0ae' } },
          { value: fuel, name: '燃油', itemStyle: { color: '#ff8a65' } },
        ],
      },
    ],
  });
}

function resizeCharts() {
  delayChart?.resize();
  barChart?.resize();
  pieChart?.resize();
}

watch(delaySeries, () => updateDelayChart(), { deep: true });
watch(
  accidentStats,
  () => {
    updateBarChart();
    updatePieChart();
  },
  { deep: true },
);

onMounted(() => {
  initDelayChart();
  initBarChart();
  initPieChart();
  window.addEventListener('resize', resizeCharts);
  startMock();
});

onUnmounted(() => {
  delayChart?.dispose();
  barChart?.dispose();
  pieChart?.dispose();
  window.removeEventListener('resize', resizeCharts);
});
</script>

<template>
  <div class="monitor-dashboard">
    <!-- 顶部栏 -->
    <div class="topbar">
      <span class="title">📊 系统监控看板</span>
      <span class="status online">● MQTT 已连接</span>
      <span class="uptime">运行时长：{{ systemMetrics.uptime }}</span>
      <span class="version-tag">v1.0 答辩演示</span>
    </div>

    <div class="main-body">
      <!-- 指标卡片行 -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">平均端到端延迟</div>
          <div class="stat-value delay">
            {{
              delaySeries.length > 0
                ? Math.round(
                    delaySeries.reduce((s, d) => s + d.value, 0) /
                      delaySeries.length,
                  )
                : 0
            }}
            <span class="stat-unit">ms</span>
          </div>
          <div class="stat-sub">目标 ≤ {{ DELAY_TARGET }}ms</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">边缘节点在线</div>
          <div class="stat-value green">
            {{ edgeNodes.filter((n) => n.status === 'online').length }}/{{
              edgeNodes.length
            }}
          </div>
          <div class="stat-sub">
            平均延迟
            {{
              Math.round(
                edgeNodes.reduce((s, n) => s + n.latency, 0) / edgeNodes.length,
              )
            }}ms
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">今日事故总数</div>
          <div class="stat-value orange">{{ accidentStats.total }}</div>
          <div class="stat-sub">起</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">消息丢包率</div>
          <div
            class="stat-value"
            :class="Number(systemMetrics.packetLossRate) > 2 ? 'red' : 'green'"
          >
            {{ systemMetrics.packetLossRate }}%
          </div>
          <div class="stat-sub">
            接收 {{ systemMetrics.messagesReceived }} / 丢失
            {{ systemMetrics.messagesLost }}
          </div>
        </div>
      </div>

      <!-- 延迟折线图 -->
      <div class="chart-card">
        <div class="chart-title">端到端延迟趋势</div>
        <div id="delay-chart" class="chart-box"></div>
      </div>

      <!-- 底部双图 -->
      <div class="chart-row">
        <div class="chart-card half">
          <div class="chart-title">今日事故小时分布</div>
          <div id="bar-chart" class="chart-box"></div>
        </div>
        <div class="chart-card half">
          <div class="chart-title">事故动力类型分布</div>
          <div id="pie-chart" class="chart-box"></div>
        </div>
      </div>

      <!-- 边缘节点状态 -->
      <div class="chart-card">
        <div class="chart-title">边缘节点状态</div>
        <div class="node-list">
          <div v-for="node in edgeNodes" :key="node.id" class="node-row">
            <span class="node-id">{{ node.id }}</span>
            <span
              class="node-dot"
              :class="node.status === 'online' ? 'online' : 'slow'"
            ></span>
            <span class="node-status">{{
              node.status === 'online' ? '在线' : '延迟偏高'
            }}</span>
            <span class="node-info">延迟 {{ node.latency }}ms</span>
            <span class="node-info">心跳 {{ node.heartbeat }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.monitor-dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: #e0e8f0;
  background: #0a1628;
}

.topbar {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;
  height: 50px;
  padding: 0 20px;
  background: linear-gradient(135deg, #0d1f3c 0%, #112240 100%);
  border-bottom: 2px solid;
  border-image: linear-gradient(90deg, #4fc3f7, #1565c0, #69f0ae) 1;
}

.title {
  font-size: 16px;
  font-weight: bold;
  color: #4fc3f7;
  letter-spacing: 0.5px;
}

.status {
  font-size: 14px;
}

.online {
  color: #69f0ae;
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.uptime {
  margin-left: auto;
  font-size: 13px;
  color: #78909c;
}

.version-tag {
  padding: 2px 10px;
  font-size: 11px;
  color: #69f0ae;
  background: rgb(105 240 174 / 10%);
  border: 1px solid rgb(105 240 174 / 30%);
  border-radius: 10px;
}

.main-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  overflow-y: auto;
}

/* 指标卡片行 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-card {
  padding: 14px 16px;
  background: #0d1f3c;
  border: 1px solid #1e3a5f;
  border-radius: 6px;
}

.stat-label {
  margin-bottom: 6px;
  font-size: 13px;
  color: #78909c;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
}

.stat-value.delay {
  color: #4fc3f7;
}

.stat-value.green {
  color: #69f0ae;
}

.stat-value.orange {
  color: #ff9100;
}

.stat-value.red {
  color: #ff5252;
}

.stat-unit {
  font-size: 16px;
  font-weight: normal;
}

.stat-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #546e7a;
}

/* 图表卡片 */
.chart-card {
  padding: 12px 16px;
  background: #0d1f3c;
  border: 1px solid #1e3a5f;
  border-radius: 6px;
}

.chart-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #4fc3f7;
}

.chart-box {
  width: 100%;
  height: 250px;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.chart-card.half .chart-box {
  height: 230px;
}

/* 边缘节点列表 */
.node-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.node-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  font-size: 13px;
  background: #132340;
  border-radius: 4px;
}

.node-id {
  min-width: 70px;
  font-weight: bold;
  color: #4fc3f7;
}

.node-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.node-dot.online {
  background: #69f0ae;
  box-shadow: 0 0 6px #69f0ae;
}

.node-dot.slow {
  background: #ff9100;
  box-shadow: 0 0 6px #ff9100;
}

.node-status {
  min-width: 60px;
  color: #b0bec5;
}

.node-info {
  color: #546e7a;
}
</style>
