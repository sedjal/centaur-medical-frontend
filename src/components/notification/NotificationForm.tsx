import { defineComponent, ref, computed, type PropType } from 'vue';
import type { AppUser, NotificationType, Patient } from '../../types';
import {
  NOTIFICATION_TYPES,
  buildNotificationPayload,
  notificationTypeLabel,
  validateNotificationForm,
} from '../../utils/notifications';
import { toDatetimeLocalValue } from '../../utils/prescriptions';
import { Button, Input, Select } from '../ui';

export default defineComponent({
  name: 'NotificationForm',
  props: {
    defaultRecipientId: { type: String, required: true },
    users: { type: Array as PropType<AppUser[]>, default: () => [] },
    patients: { type: Array as PropType<Patient[]>, default: () => [] },
    canPickRecipient: { type: Boolean, default: false },
    canPickPatient: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    error: { type: String, default: undefined },
    onSubmit: {
      type: Function as PropType<(payload: ReturnType<typeof buildNotificationPayload>) => void>,
      required: true,
    },
    onCancel: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    const recipientId = ref(props.defaultRecipientId);
    const patientId = ref('');
    const type = ref<NotificationType | ''>('GENERAL');
    const title = ref('');
    const message = ref('');
    const scheduledAtLocal = ref(toDatetimeLocalValue());
    const fieldErrors = ref<Record<string, string>>({});

    const userOptions = computed(() =>
      props.users.map((u) => ({
        value: u.id,
        label: `${u.last_name?.toUpperCase() || ''} ${u.first_name || ''} — ${u.email}`.trim(),
      }))
    );

    const patientOptions = computed(() =>
      props.patients.map((p) => ({
        value: p.id,
        label: `${String(p.last_name || '').toUpperCase()} ${p.first_name} — ${p.patient_code}`,
      }))
    );

    function submit() {
      const errors = validateNotificationForm({
        recipientId: recipientId.value,
        type: type.value,
        title: title.value,
        message: message.value,
        scheduledAtLocal: scheduledAtLocal.value,
        patientId: patientId.value,
      });
      fieldErrors.value = errors;
      if (Object.keys(errors).length) return;

      props.onSubmit(
        buildNotificationPayload({
          recipientId: recipientId.value,
          patientId: patientId.value || undefined,
          type: type.value as NotificationType,
          title: title.value,
          message: message.value,
          scheduledAtLocal: scheduledAtLocal.value,
        })
      );
    }

    return () => (
      <form
        class="notif-form"
        onSubmit={(ev: Event) => {
          ev.preventDefault();
          if (!props.saving) submit();
        }}
      >
        {props.canPickRecipient && userOptions.value.length > 0 ? (
          <Select
            label="Destinataire"
            required
            value={recipientId.value}
            options={userOptions.value}
            error={fieldErrors.value.recipientId}
            onChange={(v: string) => {
              recipientId.value = v;
            }}
          />
        ) : (
          <Input
            label="Destinataire"
            required
            value={recipientId.value}
            hint="Identifiant utilisateur destinataire"
            error={fieldErrors.value.recipientId}
            disabled={!props.canPickRecipient}
            onInput={(v: string) => {
              recipientId.value = v;
            }}
          />
        )}

        <Select
          label="Type"
          required
          value={type.value}
          options={NOTIFICATION_TYPES.map((t) => ({
            value: t,
            label: notificationTypeLabel(t),
          }))}
          error={fieldErrors.value.type}
          onChange={(v: string) => {
            type.value = (v as NotificationType) || '';
          }}
        />

        <Input
          label="Titre"
          required
          value={title.value}
          error={fieldErrors.value.title}
          onInput={(v: string) => {
            title.value = v;
          }}
        />

        <div class={`cm-field ${fieldErrors.value.message ? 'cm-field--error' : ''}`}>
          <label class="cm-field__label">
            Message <span class="cm-field__required">*</span>
          </label>
          <textarea
            class="cm-input notif-form__textarea"
            rows={4}
            value={message.value}
            required
            aria-invalid={fieldErrors.value.message ? 'true' : undefined}
            onInput={(ev: Event) => {
              message.value = (ev.target as HTMLTextAreaElement).value;
            }}
          />
          {fieldErrors.value.message && (
            <p class="cm-field__error" role="alert">
              {fieldErrors.value.message}
            </p>
          )}
        </div>

        <Input
          label="Planifier le"
          type="datetime-local"
          required
          value={scheduledAtLocal.value}
          hint="Si la date est passée ou actuelle, la notification sera marquée envoyée immédiatement."
          error={fieldErrors.value.scheduledAt}
          onInput={(v: string) => {
            scheduledAtLocal.value = v;
          }}
        />

        {props.canPickPatient && (
          <Select
            label="Patient (optionnel)"
            value={patientId.value}
            options={patientOptions.value}
            placeholder="Aucun patient"
            onChange={(v: string) => {
              patientId.value = v;
            }}
          />
        )}

        {props.error && (
          <p class="notif-form__error" role="alert">
            {props.error}
          </p>
        )}

        <div class="notif-form__actions">
          <Button
            type="button"
            variant="ghost"
            disabled={props.saving}
            onClick={() => props.onCancel?.()}
          >
            Fermer
          </Button>
          <Button type="submit" loading={props.saving} disabled={props.saving}>
            Créer la notification
          </Button>
        </div>
      </form>
    );
  },
});
