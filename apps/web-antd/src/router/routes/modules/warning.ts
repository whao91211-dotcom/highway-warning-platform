import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/warning',
    name: 'Warning',
    component: () => import('#/views/warning/index.vue'),
    meta: {
      title: '预警监控台',
      icon: 'lucide:map-pin',
    },
  },
];

export default routes;
