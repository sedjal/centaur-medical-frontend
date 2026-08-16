import { defineComponent, ref, computed, type PropType } from 'vue';
import type { AppUser, NotificationType, Patient } from '../../types';
import {
  NOTIFICATION_TYPES,
  buildNotificationPayload,
  notificationTypeLabel,
  staffDirectoryLabel,
  validateNotificationForm,
} from '../../utils/notifications';
import { toDatetimeLocalValue } from '../../utils/prescriptions';
import { Button, Input, Select, SearchableSelect } from '../ui';

export default defineComponent({
  name: 'NotificationForm',
  props: {
    users: { type: Array as PropType<AppUser[]>, default: () => [] },
    patients: { type: Array as PropType<Patient[]>, default: () => [] },
    currentUserId: { type: String, default: '' },
    canPickPatient: { type: Boolean, default: false },
    loadingRecipients: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    error: { type: String, default: undefined },
    onSubmit: {
      type: Function as PropType<(payload: ReturnType<typeof buildNotificationPayload>) => void>,
      required: true,
    },
    onCancel: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    const recipientId = ref('');
    const patientId = ref('');
    const type = ref<NotificationType | ''>('GENERAL');
    const title = ref('');
    const message = ref('');
    const scheduleMode = ref<'now' | 'later'>('now');
    const scheduledAtLocal = ref(toDatetimeLocalValue());
    const fieldErrors = ref<Record<string, string>>({});

    const userOptions = computed(() =>
      props.users.map((u) => {
        const label = staffDirectoryLabel(u);
        const self = props.currentUserId && u.id === props.currentUserId ? ' (vous)' : '';
        return {
          value: u.id,
          label: `${label}${self}`,
          searchText: [u.first_name, u.last_name, u.email, u.role].filter(Boolean).join(' '),
        };
      })
    );

    const patientOptions = computed(() =>
      props.patients.map((p) => ({
        value: p.id,
        label: `${String(p.last_name || '').toUpperCase()} ${p.first_name} — ${p.patient_code}`,
      }))
    );

    const showPatient = computed(
      () =>
        props.canPickPatient &&
        (type.value === 'PATIENT' ||
          type.value === 'PRESCRIPTION' ||
          type.value === 'MEDICAL_HISTORY' ||
          Boolean(patientId.value))
    );

    function submit() {
      const immediate = scheduleMode.value === 'now';
      const errors = validateNotificationForm({
        recipientId: recipientId.value,
        type: type.value,
        title: title.value,
        message: message.value,
        scheduledAtLocal: scheduledAtLocal.value,
        immediate,
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
          immediate,
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
        <SearchableSelect
          label="Destinataire"
          required
          value={recipientId.value}
          options={userOptions.value}
          placeholder={
            props.loadingRecipients ? 'Chargement des destinataires…' : 'Choisir un destinataire'
          }
          searchPlaceholder="Rechercher par nom, e-mail ou rôle…"
          disabled={props.loadingRecipients || userOptions.value.length === 0}
          error={fieldErrors.value.recipientId}
          onChange={(v: string) => {
            recipientId.value = v;
          }}
        />
        {!props.loadingRecipients && userOptions.value.length === 0 && (
          <p class="notif-form__hint">Aucun membre du personnel actif n’est disponible.</p>
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

        {showPatient.value && (
          <Select
            label="Patient lié (optionnel)"
            value={patientId.value}
            options={patientOptions.value}
            placeholder="Aucun patient"
            onChange={(v: string) => {
              patientId.value = v;
            }}
          />
        )}

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

        <fieldset class="notif-form__schedule">
          <legend class="cm-field__label">Planification</legend>
          <label class="notif-form__radio">
            <input
              type="radio"
              name="notif-schedule"
              checked={scheduleMode.value === 'now'}
              onChange={() => {
                scheduleMode.value = 'now';
              }}
            />
            Maintenant
          </label>
          <label class="notif-form__radio">
            <input
              type="radio"
              name="notif-schedule"
              checked={scheduleMode.value === 'later'}
              onChange={() => {
                scheduleMode.value = 'later';
              }}
            />
            Programmer
          </label>
        </fieldset>

        {scheduleMode.value === 'later' && (
          <Input
            label="Date et heure"
            type="datetime-local"
            required
            value={scheduledAtLocal.value}
            error={fieldErrors.value.scheduledAt}
            onInput={(v: string) => {
              scheduledAtLocal.value = v;
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
            Annuler
          </Button>
          <Button type="submit" loading={props.saving} disabled={props.saving}>
            Créer
          </Button>
        </div>
      </form>
    );
  },
});
