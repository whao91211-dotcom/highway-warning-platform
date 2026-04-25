const MOCK_POSITIONS = [
  { lat: 45.756, lng: 126.642 },
  { lat: 45.731, lng: 126.698 },
  { lat: 45.712, lng: 126.724 },
  { lat: 45.689, lng: 126.751 },
];

export function useMockData(accidents) {
  let timer = null;

  function startMock() {
    let index = 0;
    timer = setInterval(() => {
      const pos = MOCK_POSITIONS[index % MOCK_POSITIONS.length];
      accidents.value.unshift({
        id: `VH_${Date.now()}`,
        lat: pos.lat + (Math.random() - 0.5) * 0.01,
        lng: pos.lng + (Math.random() - 0.5) * 0.01,
        timestamp: new Date().toISOString(),
        deltaV: Math.floor(Math.random() * 60 + 20),
        rollover: Math.random() > 0.8,
        powerType: Math.random() > 0.5 ? '电动' : '燃油',
        occupants: Math.floor(Math.random() * 4 + 1),
      });
      index++;
    }, 4000);
  }

  function stopMock() {
    clearInterval(timer);
  }
  return { startMock, stopMock };
}
