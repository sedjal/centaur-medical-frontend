import { defineComponent, type PropType } from 'vue';
import Modal from './Modal';
import Button from './Button';

export default defineComponent({
  name: 'CmConfirmDialog',
  props: {
    open: { type: Boolean, required: true },
    title: { type: String, default: 'Confirmer' },
    message: { type: String, required: true },
    confirmLabel: { type: String, default: 'Confirmer' },
    cancelLabel: { type: String, default: 'Annuler' },
    danger: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    onConfirm: { type: Function as PropType<() => void>, required: true },
    onCancel: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    return () => (
      <Modal
        open={props.open}
        title={props.title}
        onClose={() => props.onCancel()}
        footer={
          <div class="cm-confirm__actions">
            <Button variant="ghost" disabled={props.loading} onClick={() => props.onCancel()}>
              {props.cancelLabel}
            </Button>
            <Button
              variant={props.danger ? 'danger' : 'primary'}
              loading={props.loading}
              onClick={() => props.onConfirm()}
            >
              {props.confirmLabel}
            </Button>
          </div>
        }
      >
        <p class="cm-confirm__msg">{props.message}</p>
      </Modal>
    );
  },
});
