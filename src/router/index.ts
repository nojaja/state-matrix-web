import { createRouter, createWebHistory } from 'vue-router';
import ProcessView from '../views/ProcessView.vue';
import ArtifactView from '../views/ArtifactView.vue';
import TriggerView from '../views/TriggerView.vue';
import CategoryView from '../views/CategoryView.vue';
import RoleView from '../views/RoleView.vue';
import ProjectView from '../views/ProjectView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/process'
    },
    {
      path: '/process',
      name: 'process',
      component: ProcessView
    },
    {
      path: '/project',
      name: 'project',
      component: ProjectView
    },
    {
      path: '/artifact',
      name: 'artifact',
      component: ArtifactView
    },
    {
      path: '/trigger',
      name: 'trigger',
      component: TriggerView
    },
    {
      path: '/category',
      name: 'category',
      component: CategoryView
    },
    {
      path: '/role',
      name: 'role',
      component: RoleView
    }
  ]
});

export default router;
