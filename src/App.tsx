import { defineComponent } from 'vue';
import { RouterView } from 'vue-router';

export default defineComponent({
  name: 'CentaurMedicalApp',
  setup() {
    return () => <RouterView />;
  },
});
