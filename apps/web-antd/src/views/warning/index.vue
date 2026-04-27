<script setup>
import { computed, ref, watch } from 'vue';

import {
  LCircle,
  LCircleMarker,
  LMap,
  LTileLayer,
} from '@vue-leaflet/vue-leaflet';

import { useAiAnalysis } from './composables/useAiAnalysis';
import { useCoordTransform } from './composables/useCoordTransform';
import { useMockData } from './composables/useMockData';
import { useMqtt } from './composables/useMqtt';
import { useWarningAnimation } from './composables/useWarningAnimation';

import 'leaflet/dist/leaflet.css';

const { connected, accidents, connect } = useMqtt();
const { startMock, stopMock } = useMockData(accidents);
const { animations, rearVehicles } = useWarningAnimation(accidents);
const { wgs84ToGcj02, haversineDistance } = useCoordTransform();
const {
  streamText,
  aiStatus,
  levelClass,
  levelText,
  rescue,
  traffic,
  startAnalysis,
} = useAiAnalysis();

connect(import.meta.env.VITE_MQTT_BROKER || 'ws://127.0.0.1:9001');

// 高德地图瓦片（GCJ-02 坐标系）
const tileUrl =
  'https://webrd{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
const tileSubdomains = ['01', '02', '03', '04'];
const attribution = '© 高德地图 AutoNavi';

const defaultGcj = wgs84ToGcj02(45.75, 126.65);
const mapCenter = ref([defaultGcj.lat, defaultGcj.lng]);
const zoom = ref(11);
const selected = ref(null);
const gcj02Center = computed(() => {
  if (!selected.value) return null;
  return wgs84ToGcj02(selected.value.lat, selected.value.lng);
});
const offsetDistance = computed(() => {
  if (!selected.value || !gcj02Center.value) return null;
  return Math.round(
    haversineDistance(
      selected.value.lat,
      selected.value.lng,
      gcj02Center.value.lat,
      gcj02Center.value.lng,
    ),
  );
});
const mocking = ref(false);

// 所有事故标注转为 GCJ-02 用于高德地图正确显示
const displayAccidents = computed(() =>
  accidents.value.map((acc) => {
    const gcj = wgs84ToGcj02(acc.lat, acc.lng);
    return { ...acc, displayLat: gcj.lat, displayLng: gcj.lng };
  }),
);

watch(selected, (acc) => startAnalysis(acc));

function selectAccident(acc) {
  selected.value = acc;
  const gcj = wgs84ToGcj02(acc.lat, acc.lng);
  mapCenter.value = [gcj.lat, gcj.lng];
  zoom.value = 13;
}

function toggleMock() {
  mocking.value = !mocking.value;
  mocking.value ? startMock() : stopMock();
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('zh-CN');
}

function onMapReady() {
  console.warn('地图已就绪');
}

function vehicleBorderColor(v) {
  if (v.status === 'processed') return '#2e7d32';
  if (v.status === 'warning') return '#f57f17';
  return '#1565c0';
}

function vehicleFillColor(v) {
  if (v.status === 'processed') return '#4caf50';
  if (v.status === 'warning') return v.flash ? '#ffeb3b' : '#f9a825';
  return '#2196f3';
}
</script>

<template>
  <div class="warning-dashboard">
    <!-- 顶部状态栏 -->
    <div class="topbar">
      <span class="title">🚨 高速公路二次事故智能预警平台</span>
      <span class="status" :class="connected ? 'online' : 'offline'">
        {{ connected ? '● MQTT 已连接' : '○ MQTT 未连接' }}
      </span>
      <span class="counter">今日事故：{{ accidents.length }} 起</span>
      <button class="mock-btn" @click="toggleMock">
        {{ mocking ? '⏹ 停止模拟' : '▶ 开始模拟' }}
      </button>
      <span class="version-tag">v1.0 答辩演示</span>
    </div>

    <!-- 主体布局 -->
    <div class="main-body">
      <!-- 地图区域 -->
      <div class="map-area">
        <LMap
          :zoom="zoom"
          :center="mapCenter"
          style="width: 100%; height: 100%"
          @ready="onMapReady"
        >
          <LTileLayer
            :url="tileUrl"
            :subdomains="tileSubdomains"
            :attribution="attribution"
          />

          <!-- 事故标注点（GCJ-02 坐标，高德地图正确对齐） -->
          <template v-for="acc in displayAccidents" :key="acc.id">
            <LCircleMarker
              :lat-lng="[acc.displayLat, acc.displayLng]"
              :radius="8"
              :color="acc.id === selected?.id ? '#ff1744' : '#ff6d00'"
              :fill-color="acc.id === selected?.id ? '#ff1744' : '#ff9100'"
              :fill-opacity="0.9"
              @click="selectAccident(acc)"
            />
          </template>

          <!-- 渐变影响区（GCJ-02 为中心） -->
          <template v-if="selected && gcj02Center">
            <LCircle
              :lat-lng="[gcj02Center.lat, gcj02Center.lng]"
              :radius="1500"
              color="#ff1744"
              :weight="1"
              :fill-opacity="0.12"
            />
            <LCircle
              :lat-lng="[gcj02Center.lat, gcj02Center.lng]"
              :radius="3000"
              color="#ff5252"
              :weight="1"
              :fill-opacity="0.08"
            />
            <LCircle
              :lat-lng="[gcj02Center.lat, gcj02Center.lng]"
              :radius="5000"
              color="#ff8a80"
              :weight="1"
              :fill-opacity="0.04"
            />
          </template>

          <!-- WGS-84 原始 GNSS 点（蓝色） -->
          <LCircleMarker
            v-if="selected"
            :lat-lng="[selected.lat, selected.lng]"
            :radius="5"
            color="#1565c0"
            fill-color="#2196f3"
            :fill-opacity="0.9"
          />

          <!-- GCJ-02 校正点（橙色） -->
          <LCircleMarker
            v-if="selected && gcj02Center"
            :lat-lng="[gcj02Center.lat, gcj02Center.lng]"
            :radius="7"
            color="#e65100"
            fill-color="#ff9100"
            :fill-opacity="0.9"
          />

          <!-- ±3m 误差圈 -->
          <LCircle
            v-if="selected && gcj02Center"
            :lat-lng="[gcj02Center.lat, gcj02Center.lng]"
            :radius="3"
            color="#ff9100"
            :weight="1"
            :fill-opacity="0.15"
            dash-array="3 3"
          />

          <!-- 预警扩散动画圆 -->
          <template v-for="(anim, id) in animations" :key="`anim_${id}`">
            <LCircle
              v-if="anim.active"
              :lat-lng="[anim.lat, anim.lng]"
              :radius="anim.radius"
              color="#ff1744"
              :weight="2"
              :fill-opacity="0.12"
            />
          </template>

          <!-- 后方虚拟车辆 -->
          <template
            v-for="(vehicles, accId) in rearVehicles"
            :key="`rvg_${accId}`"
          >
            <template v-for="v in vehicles" :key="v.id">
              <LCircleMarker
                :lat-lng="[v.lat, v.lng]"
                :radius="4"
                :color="vehicleBorderColor(v)"
                :fill-color="vehicleFillColor(v)"
                :fill-opacity="0.85"
              />
            </template>
          </template>
        </LMap>
      </div>

      <!-- 右侧面板 -->
      <div class="side-panel">
        <!-- 事故详情卡片 -->
        <div v-if="selected" class="detail-card">
          <div class="card-title">📍 事故详情</div>
          <div class="detail-row">
            <span>车辆ID</span><span>{{ selected.id }}</span>
          </div>
          <div class="detail-row">
            <span>速度变化</span><span class="highlight">{{ selected.deltaV }} g</span>
          </div>
          <div class="detail-row">
            <span>动力类型</span><span>{{ selected.powerType }}</span>
          </div>
          <div class="detail-row">
            <span>车内人数</span><span>{{ selected.occupants }} 人</span>
          </div>
          <div class="detail-row">
            <span>翻滚状态</span>
            <span :class="selected.rollover ? 'danger' : 'safe'">
              {{ selected.rollover ? '⚠ 已翻滚' : '✓ 未翻滚' }}
            </span>
          </div>
          <div class="detail-row">
            <span>经度</span><span>{{ selected.lng.toFixed(5) }}</span>
          </div>
          <div class="detail-row">
            <span>纬度</span><span>{{ selected.lat.toFixed(5) }}</span>
          </div>
          <div class="detail-row offset-row">
            <span>坐标偏移 (WGS→GCJ)</span>
            <span class="highlight">{{ offsetDistance }}m</span>
          </div>
          <div class="detail-row">
            <span>定位精度</span><span class="safe">±3m</span>
          </div>
          <div class="detail-row">
            <span>触发时间</span><span>{{ formatTime(selected.timestamp) }}</span>
          </div>
        </div>

        <!-- AI 研判面板 -->
        <div v-if="selected" class="ai-panel">
          <div class="card-title">🤖 AI 研判结果</div>

          <div v-if="aiStatus === 'streaming'" class="ai-streaming">
            <span class="ai-text">{{ streamText }}</span>
            <span class="cursor-blink">|</span>
          </div>

          <div v-if="aiStatus === 'done'" class="ai-result">
            <div class="ai-level" :class="levelClass">
              {{ levelText }}
            </div>
            <div class="ai-detail">
              <div class="ai-section">
                <div class="ai-label">🚑 救援力量</div>
                <div class="ai-value">{{ rescue }}</div>
              </div>
              <div class="ai-section">
                <div class="ai-label">🚧 交通管制</div>
                <div class="ai-value">{{ traffic }}</div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-select">点击地图上的事故点查看详情</div>

        <!-- 事故列表 -->
        <div class="list-title">事故记录（{{ accidents.length }}）</div>
        <div class="accident-list">
          <div
            v-for="acc in accidents"
            :key="acc.id"
            class="accident-item"
            :class="{ active: selected?.id === acc.id }"
            @click="selectAccident(acc)"
          >
            <div class="item-header">
              <span class="item-id">{{ acc.id.slice(0, 16) }}</span>
              <span
                class="item-type"
                :class="acc.powerType === '电动' ? 'ev' : 'fuel'"
              >
                {{ acc.powerType }}
              </span>
            </div>
            <div class="item-info">
              ΔV: {{ acc.deltaV }}g ｜ {{ acc.occupants }}人
            </div>
            <div class="item-time">{{ formatTime(acc.timestamp) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.warning-dashboard {
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
  font-size: 13px;
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

.offline {
  color: #ff5252;
}

.counter {
  margin-left: auto;
  font-size: 13px;
  color: #b0bec5;
}

.mock-btn {
  padding: 5px 14px;
  font-size: 13px;
  color: white;
  cursor: pointer;
  background: #1565c0;
  border: none;
  border-radius: 4px;
}

.mock-btn:hover {
  background: #1976d2;
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
  overflow: hidden;
}

.map-area {
  position: relative;
  flex: 1;
}

.side-panel {
  display: flex;
  flex-direction: column;
  width: 340px;
  overflow: hidden;
  background: #0d1f3c;
  border-left: 1px solid #1e3a5f;
}

.detail-card {
  flex-shrink: 0;
  padding: 12px;
  border-bottom: 1px solid #1e3a5f;
}

.card-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #4fc3f7;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
  border-bottom: 1px solid #132340;
}

.detail-row span:first-child {
  color: #78909c;
}

.offset-row {
  border-bottom: 1px dashed #1e3a5f;
}

.highlight {
  font-weight: bold;
  color: #ff9100;
}

.danger {
  color: #ff5252;
}

.safe {
  color: #69f0ae;
}

.no-select {
  padding: 16px 12px;
  font-size: 13px;
  color: #546e7a;
  border-bottom: 1px solid #1e3a5f;
}

.list-title {
  flex-shrink: 0;
  padding: 10px 12px 6px;
  font-size: 14px;
  font-weight: 600;
  color: #4fc3f7;
}

.accident-list {
  flex: 1;
  padding: 0 8px 8px;
  overflow-y: auto;
}

.accident-item {
  padding: 8px 10px;
  margin-bottom: 6px;
  cursor: pointer;
  background: #132340;
  border: 1px solid #1e3a5f;
  border-radius: 6px;
  transition: all 0.2s;
}

.accident-item:hover,
.accident-item.active {
  background: #1a2f50;
  border-color: #f44;
}

.item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
}

.item-id {
  font-size: 12px;
  color: #ff8a65;
}

.item-type {
  padding: 1px 6px;
  font-size: 12px;
  border-radius: 3px;
}

.ev {
  color: #69f0ae;
  background: #1b5e20;
}

.fuel {
  color: #ff8a65;
  background: #3e2723;
}

.item-info {
  font-size: 13px;
  color: #b0bec5;
}

.item-time {
  margin-top: 2px;
  font-size: 12px;
  color: #546e7a;
}

/* AI 研判面板 */
.ai-panel {
  flex-shrink: 0;
  padding: 12px;
  border-bottom: 1px solid #1e3a5f;
}

.ai-streaming {
  padding: 8px 10px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #69f0ae;
  white-space: pre-wrap;
  background: #0a111f;
  border-radius: 4px;
}

.cursor-blink {
  font-weight: bold;
  color: #69f0ae;
  animation: blink 0.6s infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

.ai-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-level {
  padding: 6px 10px;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
  border-radius: 4px;
}

.ai-level.level-1 {
  color: #ff5252;
  background: #311b1b;
  border: 1px solid #ff5252;
}

.ai-level.level-2 {
  color: #ff9100;
  background: #2d2413;
  border: 1px solid #ff9100;
}

.ai-level.level-3 {
  color: #ffeb3b;
  background: #2d2a13;
  border: 1px solid #f9a825;
}

.ai-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-section {
  padding: 8px 10px;
  background: #132340;
  border-radius: 4px;
}

.ai-label {
  margin-bottom: 4px;
  font-size: 13px;
  color: #78909c;
}

.ai-value {
  font-size: 13px;
  color: #e0e8f0;
}
</style>
