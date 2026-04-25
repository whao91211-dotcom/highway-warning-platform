import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/monitor/index.vue'),
    meta: {
      icon: 'lucide:bar-chart-3',
      title: '系统监控看板',
    },
    name: 'Monitor',
    path: '/monitor',
  },
];

export default routes;
