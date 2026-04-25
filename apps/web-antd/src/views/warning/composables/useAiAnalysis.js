import { onUnmounted, ref } from 'vue';

function localRule(accident) {
  const { deltaV, rollover, powerType, occupants } = accident;

  let level;
  let levelText;
  if (deltaV >= 60 || rollover || occupants >= 3) {
    level = 1;
    levelText = '一级（重大）';
  } else if (deltaV >= 30 || powerType === '电动') {
    level = 2;
    levelText = '二级（一般）';
  } else {
    level = 3;
    levelText = '三级（轻微）';
  }

  const rescueMap = {
    1: '3辆救护车 + 1辆消防车 + 2辆警车，救援半径10km',
    2: '1辆救护车 + 1辆警车，救援半径5km',
    3: '1辆警车，现场处理',
  };
  const trafficMap = {
    1: '封闭事故车道+相邻车道，限速40km/h，建议绕行',
    2: '封闭事故车道，限速60km/h',
    3: '警示减速，限速80km/h',
  };

  const powerLabel = powerType === '电动' ? '电动车型' : '燃油车型';
  const rolloverLabel = rollover ? '已翻滚' : '未翻滚';

  const reasonText = [
    `> 正在分析事故数据...`,
    `> ΔV: ${deltaV}g | ${powerLabel} | ${occupants}人 | ${rolloverLabel}`,
    `> 匹配事故案例库...`,
    `> 综合判定：${levelText}事故`,
    powerType === '电动' ? `> 电动车型，电池包需检查` : `> 燃油车型，注意燃油泄漏`,
    rollover ? `> 车辆已翻滚，人员伤亡风险高` : null,
    occupants >= 3 ? `> 车内人数较多，需增派救援力量` : null,
    `> 建议派遣 ${rescueMap[level]}`,
    `> ${trafficMap[level]}`,
    `> 已通知最近急救中心和交警大队`,
  ]
    .filter(Boolean)
    .join('\n');

  return { level, levelText, rescue: rescueMap[level], traffic: trafficMap[level], reasonText };
}

export function useAiAnalysis() {
  const streamText = ref('');
  const aiStatus = ref('idle'); // 'idle' | 'streaming' | 'done'
  const levelClass = ref('');
  const levelText = ref('');
  const rescue = ref('');
  const traffic = ref('');
  const currentId = ref(null);

  let streamTimer = null;

  function startAnalysis(accident) {
    if (!accident) return;
    if (currentId.value === accident.id && aiStatus.value !== 'idle') return;

    clearTimeout(streamTimer);
    clearInterval(streamTimer);
    currentId.value = accident.id;
    aiStatus.value = 'streaming';
    streamText.value = '';
    levelClass.value = '';
    levelText.value = '';
    rescue.value = '';
    traffic.value = '';

    const result = localRule(accident);
    const fullText = result.reasonText;
    let charIndex = 0;

    // 1.5s delay before streaming
    streamTimer = setTimeout(() => {
      streamTimer = setInterval(() => {
        charIndex++;
        streamText.value = fullText.slice(0, charIndex);

        if (charIndex >= fullText.length) {
          clearInterval(streamTimer);
          setTimeout(() => {
            aiStatus.value = 'done';
            levelClass.value = `level-${result.level}`;
            levelText.value = result.levelText;
            rescue.value = result.rescue;
            traffic.value = result.traffic;
          }, 300);
        }
      }, 30);
    }, 1500);
  }

  onUnmounted(() => {
    clearTimeout(streamTimer);
    clearInterval(streamTimer);
  });

  return { streamText, aiStatus, levelClass, levelText, rescue, traffic, startAnalysis };
}
