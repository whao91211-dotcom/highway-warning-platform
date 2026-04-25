import { onUnmounted, ref } from 'vue';

import mqtt from 'mqtt';

export function useMqtt() {
  const client = ref(null);
  const connected = ref(false);
  const accidents = ref([]);

  function connect(brokerUrl) {
    client.value = mqtt.connect(brokerUrl, {
      clientId: `web_${Math.random().toString(16).slice(2)}`,
      keepalive: 30,
      reconnectPeriod: 3000,
    });
    client.value.on('connect', () => {
      connected.value = true;
      client.value.subscribe('accident/#');
    });
    client.value.on('disconnect', () => {
      connected.value = false;
    });
    client.value.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString());
        if (topic.includes('/msd')) {
          accidents.value.unshift({
            id: data.vehicleId,
            lat: data.latitude,
            lng: data.longitude,
            timestamp: data.triggerTime,
            deltaV: data.deltaV,
            rollover: data.rolloverState,
            powerType: data.powerType,
            occupants: data.occupants,
          });
        }
      } catch (error) {
        console.error('MQTT消息解析失败', error);
      }
    });
  }

  onUnmounted(() => client.value?.end());
  return { connect, connected, accidents };
}
