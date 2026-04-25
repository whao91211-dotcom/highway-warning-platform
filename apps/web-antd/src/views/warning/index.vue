<script setup>
import { ref } from 'vue';

import {
  LCircle,
  LCircleMarker,
  LMap,
  LTileLayer,
} from '@vue-leaflet/vue-leaflet';

import { useMockData } from './composables/useMockData';
import { useMqtt } from './composables/useMqtt';
import { useWarningAnimation } from './composables/useWarningAnimation';

import 'leaflet/dist/leaflet.css';

const { connected, accidents, connect } = useMqtt();
const { startMock, stopMock } = useMockData(accidents);
const { animations, rearVehicles } = useWarningAnimation(accidents);

connect(import.meta.env.VITE_MQTT_BROKER || 'ws://127.0.0.1:9001');

const mapCenter = ref([45.75, 126.65]);
const zoom = ref(11);
const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const attribution = '© OpenStreetMap';
const selected = ref(null);
const mocking = ref(false);

function selectAccident(acc) {
  selected.value = acc;
  mapCenter.value = [acc.lat, acc.lng];
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
          <LTileLayer :url="tileUrl" :attribution="attribution" />

          <!-- 事故标注点 -->
          <template v-for="acc in accidents" :key="acc.id">
            <LCircleMarker
              :lat-lng="[acc.lat, acc.lng]"
              :radius="8"
              :color="acc.id === selected?.id ? '#ff1744' : '#ff6d00'"
              :fill-color="acc.id === selected?.id ? '#ff1744' : '#ff9100'"
              :fill-opacity="0.9"
              @click="selectAccident(acc)"
            />
          </template>

          <!-- 选中事故的5km预警范围圆 -->
          <LCircle
            v-if="selected"
            :lat-lng="[selected.lat, selected.lng]"
            :radius="5000"
            color="#ff1744"
            :weight="2"
            :fill-opacity="0.08"
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
          <div class="detail-row">
            <span>触发时间</span><span>{{ formatTime(selected.timestamp) }}</span>
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
  height: 48px;
  padding: 0 16px;
  background: #0d1f3c;
  border-bottom: 1px solid #1e3a5f;
}

.title {
  font-size: 15px;
  font-weight: bold;
  color: #4fc3f7;
}

.status {
  font-size: 13px;
}

.online {
  color: #69f0ae;
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
  width: 300px;
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
  font-size: 13px;
  color: #4fc3f7;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 12px;
  border-bottom: 1px solid #132340;
}

.detail-row span:first-child {
  color: #78909c;
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
  font-size: 12px;
  color: #546e7a;
  border-bottom: 1px solid #1e3a5f;
}

.list-title {
  flex-shrink: 0;
  padding: 10px 12px 6px;
  font-size: 13px;
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
  font-size: 11px;
  color: #ff8a65;
}

.item-type {
  padding: 1px 6px;
  font-size: 11px;
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
  font-size: 12px;
  color: #b0bec5;
}

.item-time {
  margin-top: 2px;
  font-size: 11px;
  color: #546e7a;
}
</style>
