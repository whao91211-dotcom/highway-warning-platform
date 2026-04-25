import { onUnmounted, reactive, watch } from 'vue';

/**
 * 预警动画 composable
 * - 红色扩散圆从事故点向外扩展至5km
 * - 事故点后方自动生成虚拟车辆标注
 * - 车辆状态：蓝（未预警）→ 黄闪烁（收到预警）→ 绿（已处理）
 */
export function useWarningAnimation(accidents) {
  const animations = reactive({});
  const rearVehicles = reactive({});
  const timers = new Map();

  function generateRearVehicles(accident) {
    const count = 3 + Math.floor(Math.random() * 3);
    const vehicles = [];
    for (let i = 0; i < count; i++) {
      vehicles.push({
        id: `${accident.id}_rv_${i}`,
        lat: accident.lat - (i + 1) * 0.005,
        lng: accident.lng + (Math.random() - 0.5) * 0.004,
        status: 'unwarned',
        flash: false,
      });
    }
    rearVehicles[accident.id] = vehicles;
    return vehicles;
  }

  function triggerAnimation(accident) {
    if (animations[accident.id]) return;

    const anim = {
      id: accident.id,
      lat: accident.lat,
      lng: accident.lng,
      radius: 0,
      active: true,
    };
    animations[accident.id] = anim;

    const vehicles = generateRearVehicles(accident);
    const start = Date.now();
    const duration = 2000;
    let flashTick = false;
    let lastFlash = 0;

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      anim.radius = progress * 5000;

      if (elapsed - lastFlash >= 500) {
        flashTick = !flashTick;
        lastFlash = elapsed;
      }

      vehicles.forEach((v) => {
        const dLat = (v.lat - accident.lat) * 111_320;
        const dLng =
          (v.lng - accident.lng) *
          111_320 *
          Math.cos((accident.lat * Math.PI) / 180);
        const dist = Math.hypot(dLat, dLng);

        if (v.status === 'unwarned' && dist <= anim.radius) {
          v.status = 'warning';
          v.warnedAt = elapsed;
        }
        if (v.status === 'warning') {
          v.flash = flashTick;
          if (elapsed - v.warnedAt >= 3000) {
            v.status = 'processed';
            v.flash = false;
          }
        }
      });

      if (progress >= 1) {
        clearInterval(timer);
        timers.delete(accident.id);
        setTimeout(() => {
          Reflect.deleteProperty(animations, accident.id);
          Reflect.deleteProperty(rearVehicles, accident.id);
        }, 6000);
      }
    }, 50);

    timers.set(accident.id, timer);
  }

  // 监听新事故自动触发动画
  watch(
    () => accidents.value.length,
    (len, oldLen) => {
      if (len > oldLen) {
        accidents.value
          .slice(0, len - oldLen)
          .forEach((acc) => triggerAnimation(acc));
      }
    },
  );

  onUnmounted(() => {
    timers.forEach((t) => clearInterval(t));
    timers.clear();
  });

  return { animations, rearVehicles, triggerAnimation };
}
