import { defineComponent, type PropType } from 'vue';

export type IconName =
  | 'document'
  | 'clock'
  | 'clipboard'
  | 'folder'
  | 'calendar'
  | 'pencil'
  | 'eye'
  | 'download'
  | 'close'
  | 'trash'
  | 'shield'
  | 'user'
  | 'pill'
  | 'check';

const CmIcon = defineComponent({
  name: 'CmIcon',
  props: {
    name: { type: String as PropType<IconName>, required: true },
    size: { type: Number, default: 18 },
  },
  setup(props) {
    return () => {
      const s = props.size;
      const n = props.name;
      return (
        <svg
          class="cm-icon"
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {n === 'document' ? (
            <g>
              <path
                d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
              <path d="M14 3v6h6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
            </g>
          ) : null}
          {n === 'clock' ? (
            <g>
              <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8" />
              <path d="M12 8v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </g>
          ) : null}
          {n === 'clipboard' ? (
            <g>
              <rect x="6" y="5" width="12" height="16" rx="2" stroke="currentColor" stroke-width="1.8" />
              <path d="M9 5V4h6v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <path d="M9 11h6M9 15h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </g>
          ) : null}
          {n === 'folder' ? (
            <path
              d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          ) : null}
          {n === 'calendar' ? (
            <g>
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.8" />
              <path
                d="M8 3v4M16 3v4M3 10h18"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </g>
          ) : null}
          {n === 'pencil' ? (
            <path
              d="M4 20h4L20 8l-4-4L4 16v4Z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          ) : null}
          {n === 'eye' ? (
            <g>
              <path
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                stroke="currentColor"
                stroke-width="1.8"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" />
            </g>
          ) : null}
          {n === 'download' ? (
            <path
              d="M12 4v12m0 0 4-4m-4 4-4-4M5 20h14"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          ) : null}
          {n === 'close' ? (
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          ) : null}
          {n === 'trash' ? (
            <path
              d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          ) : null}
          {n === 'shield' ? (
            <path
              d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6l-7-3Z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          ) : null}
          {n === 'user' ? (
            <g>
              <circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.8" />
              <path
                d="M5 19c1.2-3 3.6-4.5 7-4.5S17.8 16 19 19"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </g>
          ) : null}
          {n === 'pill' ? (
            <rect
              x="7"
              y="3.5"
              width="10"
              height="17"
              rx="5"
              transform="rotate(45 12 12)"
              stroke="currentColor"
              stroke-width="1.8"
            />
          ) : null}
          {n === 'check' ? (
            <path
              d="M5 12.5 9.5 17 19 7.5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          ) : null}
        </svg>
      );
    };
  },
});

export { CmIcon };
export default CmIcon;
