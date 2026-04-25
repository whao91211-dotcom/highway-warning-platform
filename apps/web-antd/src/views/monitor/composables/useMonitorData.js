import { onUnmounted, reactive, ref } from 'vue';

export function useMonitorData() {
  const DELAY_TARGET = 2000;
  const MAX_POINTS = 30;

  const delaySeries = ref([]);
  const edgeNodes = reactive([
    { id: 'Edge-01', status: 'online', heartbeat: '刚刚', latency: 8 },
    { id: 'Edge-02', status: 'online', heartbeat: '2秒前', latency: 12 },
    { id: 'Edge-03', status: 'online', heartbeat: '5秒前', latency: 45 },
  ]);

  const accidentStats = reactive({
    total: 12,
    hourly: [
      0, 0, 0, 0, 0, 0, 2, 3, 3, 2, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
    ],
    powerTypes: { electric: 7, fuel: 5 },
  });

  const systemMetrics = reactive({
    uptime: '02:34:17',
    messagesReceived: 156,
    messagesLost: 2,
    packetLossRate: '1.28',
  });

  // 初始化历史延迟数据
  const now = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };
  for (let i = MAX_POINTS - 1; i >= 0; i--) {
    delaySeries.value.push({ time: '', value: 800 + Math.random() * 1500 });
  }

  let timer = null;

  function startMock() {
    if (timer) return;
    timer = setInterval(() => {
      // 更新延迟数据
      delaySeries.value.push({
        time: now(),
        value: 600 + Math.random() * 2000,
      });
      if (delaySeries.value.length > MAX_POINTS) {
        delaySeries.value.shift();
      }

      // 更新边缘节点状态
      edgeNodes.forEach((node) => {
        if (Math.random() > 0.7) {
          node.heartbeat = `${1 + Math.floor(Math.random() * 10)}秒前`;
          node.latency = Math.floor(Math.random() * 50);
          node.status = node.latency > 40 ? 'slow' : 'online';
        }
      });

      // 更新系统指标
      systemMetrics.messagesReceived += Math.floor(Math.random() * 3);
      if (Math.random() > 0.9) systemMetrics.messagesLost += 1;
      systemMetrics.packetLossRate = (
        (systemMetrics.messagesLost / systemMetrics.messagesReceived) *
        100
      ).toFixed(2);
    }, 3000);
  }

  onUnmounted(() => {
    clearInterval(timer);
  });

  return {
    delaySeries,
    edgeNodes,
    accidentStats,
    systemMetrics,
    DELAY_TARGET,
    MAX_POINTS,
    startMock,
  };
}
