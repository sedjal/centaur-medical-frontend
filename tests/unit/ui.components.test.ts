/**
 * Unit tests — UI design system (Phase 2)
 */
import '../setup-dom';
import test from 'tape';
import { h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import Badge from '../../src/components/ui/Badge';
import EmptyState from '../../src/components/ui/EmptyState';
import Modal from '../../src/components/ui/Modal';
import ConfirmDialog from '../../src/components/ui/ConfirmDialog';
import SearchableSelect, {
  filterSearchableOptions,
} from '../../src/components/ui/SearchableSelect';
import NotificationBadge from '../../src/components/notification/NotificationBadge';

test('Button: render children', (t) => {
  const wrapper = mount(Button, {
    slots: { default: () => 'Enregistrer' },
  });
  t.ok(wrapper.text().includes('Enregistrer'));
  t.ok(wrapper.classes().includes('cm-btn--primary'));
  wrapper.unmount();
  t.end();
});

test('Button: disabled', (t) => {
  const wrapper = mount(Button, {
    props: { disabled: true },
    slots: { default: () => 'OK' },
  });
  t.ok((wrapper.element as HTMLButtonElement).disabled);
  wrapper.unmount();
  t.end();
});

test('Button: loading désactive et affiche spinner', (t) => {
  const wrapper = mount(Button, {
    props: { loading: true },
    slots: { default: () => 'Sauver' },
  });
  t.ok((wrapper.element as HTMLButtonElement).disabled);
  t.ok(wrapper.find('.cm-btn__spinner').exists());
  t.equal(wrapper.attributes('aria-busy'), 'true');
  wrapper.unmount();
  t.end();
});

test('Button: click appelle onClick', (t) => {
  let clicked = 0;
  const wrapper = mount(Button, {
    props: {
      onClick: () => {
        clicked += 1;
      },
    },
    slots: { default: () => 'Go' },
  });
  wrapper.trigger('click');
  t.equal(clicked, 1);
  wrapper.unmount();
  t.end();
});

test('Button: click ignoré si disabled', (t) => {
  let clicked = 0;
  const wrapper = mount(Button, {
    props: {
      disabled: true,
      onClick: () => {
        clicked += 1;
      },
    },
    slots: { default: () => 'No' },
  });
  wrapper.trigger('click');
  t.equal(clicked, 0);
  wrapper.unmount();
  t.end();
});

test('Input: render label + value', (t) => {
  const wrapper = mount(Input, {
    props: { label: 'Email', value: 'a@b.c', name: 'email' },
  });
  t.ok(wrapper.text().includes('Email'));
  t.equal(wrapper.find('input').element.value, 'a@b.c');
  wrapper.unmount();
  t.end();
});

test('Input: error + aria-invalid', (t) => {
  const wrapper = mount(Input, {
    props: { label: 'Nom', error: 'Champ requis', value: '' },
  });
  t.ok(wrapper.text().includes('Champ requis'));
  t.equal(wrapper.find('input').attributes('aria-invalid'), 'true');
  t.ok(wrapper.find('[role="alert"]').exists());
  wrapper.unmount();
  t.end();
});

test('Input: onInput event', (t) => {
  let received = '';
  const wrapper = mount(Input, {
    props: {
      value: '',
      onInput: (v: string) => {
        received = v;
      },
    },
  });
  wrapper.find('input').setValue('Ahmed');
  t.equal(received, 'Ahmed');
  wrapper.unmount();
  t.end();
});

test('Badge: variants', (t) => {
  for (const variant of ['default', 'success', 'warning', 'danger', 'info'] as const) {
    const wrapper = mount(Badge, {
      props: { variant },
      slots: { default: () => 'Label' },
    });
    t.ok(wrapper.classes().includes(`cm-badge--${variant}`), variant);
    wrapper.unmount();
  }
  t.end();
});

test('EmptyState: title + description', (t) => {
  const wrapper = mount(EmptyState, {
    props: {
      title: 'Ordonnances indisponibles',
      description: 'API non activée.',
    },
  });
  t.ok(wrapper.text().includes('Ordonnances indisponibles'));
  t.ok(wrapper.text().includes('API non activée.'));
  wrapper.unmount();
  t.end();
});

test('Modal: open / close via bouton', async (t) => {
  let closed = false;
  const wrapper = mount(Modal, {
    props: {
      open: true,
      title: 'Détail',
      onClose: () => {
        closed = true;
      },
    },
    slots: { default: () => h('p', 'Contenu') },
  });
  t.ok(wrapper.find('[role="dialog"]').exists());
  t.ok(wrapper.text().includes('Contenu'));
  await wrapper.find('.cm-modal__close').trigger('click');
  t.ok(closed);
  wrapper.unmount();
  t.end();
});

test('Modal: fermeture Escape', async (t) => {
  let closed = false;
  const wrapper = mount(Modal, {
    props: {
      open: true,
      title: 'Esc',
      onClose: () => {
        closed = true;
      },
    },
    slots: { default: () => 'Body' },
    attachTo: document.body,
  });
  await flushPromises();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  await nextTick();
  t.ok(closed);
  wrapper.unmount();
  t.end();
});

test('Modal: closed when open=false', (t) => {
  const wrapper = mount(Modal, {
    props: {
      open: false,
      onClose: () => undefined,
    },
    slots: { default: () => 'Hidden' },
  });
  t.notOk(wrapper.find('[role="dialog"]').exists());
  wrapper.unmount();
  t.end();
});

test('ConfirmDialog: confirm + cancel', async (t) => {
  let confirmed = false;
  let cancelled = false;
  const wrapper = mount(ConfirmDialog, {
    props: {
      open: true,
      title: 'Supprimer le patient',
      message: 'Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      danger: true,
      onConfirm: () => {
        confirmed = true;
      },
      onCancel: () => {
        cancelled = true;
      },
    },
    attachTo: document.body,
  });
  await flushPromises();
  t.ok(wrapper.text().includes('Cette action est irréversible.'));

  const buttons = wrapper.findAll('button');
  const cancelBtn = buttons.find((b) => b.text().includes('Annuler'));
  const confirmBtn = buttons.find((b) => b.text().includes('Supprimer') && !b.classes().includes('cm-modal__close'));
  t.ok(cancelBtn);
  t.ok(confirmBtn);

  await cancelBtn!.trigger('click');
  t.ok(cancelled);

  cancelled = false;
  await confirmBtn!.trigger('click');
  t.ok(confirmed);

  wrapper.unmount();
  t.end();
});

test('filterSearchableOptions: filtre nom / e-mail / accents', (t) => {
  const options = [
    {
      value: 'u1',
      label: 'SEDJAL Lydia — Direction',
      searchText: 'Lydia Sedjal direction@test.com DIRECTION',
    },
    {
      value: 'u2',
      label: 'SEC Sam — Secrétaire',
      searchText: 'Sam Sec sec@test.com SECRETAIRE',
    },
  ];
  t.equal(filterSearchableOptions(options, '').length, 2);
  t.equal(filterSearchableOptions(options, 'sedjal')[0].value, 'u1');
  t.equal(filterSearchableOptions(options, 'sec@test')[0].value, 'u2');
  t.equal(filterSearchableOptions(options, 'secretaire')[0].value, 'u2');
  t.equal(filterSearchableOptions(options, 'zzzz').length, 0);
  t.end();
});

test('SearchableSelect: recherche et sélection', async (t) => {
  let chosen = '';
  const wrapper = mount(SearchableSelect, {
    props: {
      label: 'Destinataire',
      value: '',
      placeholder: 'Choisir un destinataire',
      searchPlaceholder: 'Rechercher par nom, e-mail ou rôle…',
      options: [
        { value: 'u1', label: 'SEDJAL Lydia — Direction', searchText: 'Lydia' },
        { value: 'u2', label: 'SEC Sam — Secrétaire', searchText: 'Sam Sec' },
      ],
      onChange: (v: string) => {
        chosen = v;
      },
    },
    attachTo: document.body,
  });
  await flushPromises();
  const input = wrapper.find('.cm-combobox__input');
  t.ok(input.exists());
  await input.trigger('focus');
  await flushPromises();
  t.ok(wrapper.find('.cm-combobox__menu').exists());
  t.match(wrapper.text(), /SEC Sam/);

  await input.setValue('sam');
  await flushPromises();
  t.match(wrapper.text(), /SEC Sam/);
  t.equal(wrapper.text().includes('SEDJAL Lydia'), false);

  const option = wrapper.findAll('.cm-combobox__option').find((li) => /SEC Sam/.test(li.text()));
  t.ok(option);
  await option!.trigger('mousedown');
  await flushPromises();
  t.equal(chosen, 'u2');
  wrapper.unmount();
  t.end();
});

test('NotificationBadge: 0 / 1 / 99+', (t) => {
  const none = mount(NotificationBadge, { props: { count: 0 } });
  t.equal(none.find('.notif-badge').exists(), false);
  none.unmount();

  const one = mount(NotificationBadge, { props: { count: 1 } });
  t.equal(one.find('.notif-badge').text(), '1');
  one.unmount();

  const many = mount(NotificationBadge, { props: { count: 120 } });
  t.equal(many.find('.notif-badge').text(), '99+');
  many.unmount();
  t.end();
});
