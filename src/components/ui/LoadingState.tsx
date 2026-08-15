import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CmLoadingState',
  props: {
    message: { type: String, default: 'Chargement…' },
  },
  setup(props) {
    return () => (
      <div class="cm-loading-state" role="status" aria-live="polite" aria-label={props.message}>
        <span class="cm-spinner" aria-hidden="true" />
        {props.message && <p class="cm-loading-state__msg">{props.message}</p>}
      </div>
    );
  },
});
