import { defineComponent, type PropType } from 'vue';
import Button from './Button';

export default defineComponent({
  name: 'CmErrorState',
  props: {
    title: { type: String, default: 'Une erreur est survenue' },
    message: { type: String, required: true },
    retry: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    return () => (
      <div class="cm-error-state" role="alert">
        <h3 class="cm-error-state__title">{props.title}</h3>
        <p class="cm-error-state__msg">{props.message}</p>
        {props.retry && (
          <div class="cm-error-state__action">
            <Button variant="outline" onClick={() => props.retry?.()}>
              Réessayer
            </Button>
          </div>
        )}
      </div>
    );
  },
});
