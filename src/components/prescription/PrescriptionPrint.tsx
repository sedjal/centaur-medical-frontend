import { defineComponent, type PropType, onMounted } from 'vue';
import type { Prescription, Patient } from '../../types';
import { formatPrescriptionDate, parsePrescriptionNotes } from '../../utils/prescriptions';
import { serviceLabel } from '../../utils/permissions';

function calcAge(patient: Patient): string {
  const dob = (patient as unknown as Record<string, unknown>)['date_of_birth'] as string | undefined;
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} ans`;
}

function genderLabel(patient: Patient): string {
  const g = (patient as unknown as Record<string, unknown>)['gender'] as string | undefined;
  if (!g) return '—';
  return g === 'F' || g === 'FEMME' ? 'Femme' : 'Homme';
}

export default defineComponent({
  name: 'PrescriptionPrint',
  props: {
    prescription: { type: Object as PropType<Prescription>, required: true },
    patient: { type: Object as PropType<Patient | null>, default: null },
    prescriptionNumber: { type: Number, default: 1 },
    /** Clinic info, falls back to defaults */
    clinicName: { type: String, default: '' },
    clinicAddress: { type: String, default: '' },
    clinicPhone: { type: String, default: '' },
    clinicEmail: { type: String, default: '' },
    agrement: { type: String, default: '' },
  },
  setup(props) {
    onMounted(() => {
      if (typeof document !== 'undefined' && !document.getElementById('rx-print-fonts')) {
        const link = document.createElement('link');
        link.id = 'rx-print-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Caveat:wght@700&display=swap';
        document.head.appendChild(link);
      }
    });

    return () => {
      const rx = props.prescription;
      const p = props.patient;
      const meds = (rx.medications || []).filter((m) => m && m.name);
      const now = new Date();
      const printedAt = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const nameClinic = props.clinicName || 'CENTAUR CLINICAL';
      const addressClinic = props.clinicAddress || 'Mohamadia, Alger';
      const phoneClinic = props.clinicPhone || '+213 (0) 21 00 00 00';
      const emailClinic = props.clinicEmail || 'infos@centclin.com';
      const numAgrement = props.agrement || 'MSPRH-2026-0819-A';

      const docService = p?.service ? serviceLabel(p.service) : 'Médecine Générale';

      // Parse custom notes metadata
      const parsedNotes = parsePrescriptionNotes(rx.notes);
      const docName = parsedNotes.customDoctor || rx.doctorName || 'Médecin Praticien';
      const ageStr = parsedNotes.customAge || (p ? calcAge(p) : '—');
      const genderStr = parsedNotes.customGender || (p ? genderLabel(p) : '—');
      const userNotesText = parsedNotes.userNotes;

      const rxNumberStr = String(props.prescriptionNumber).padStart(4, '0');

      return (
        <div class="rx-print-page">
          {/* Decorative Top Bar */}
          <div class="rx-print-top-bar" />

          {/* Header */}
          <div class="rx-print-header">
            <div class="rx-print-clinic-block">
              <div class="rx-print-logo-container">
                <svg class="rx-print-logo-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Green outer ring (C frame) */}
                  <path d="M 85 20 A 45 45 0 1 0 85 100" stroke="#009639" stroke-width="8" stroke-linecap="round" />
                  {/* Inner concentric grey arc */}
                  <path d="M 78 28 A 37 37 0 1 0 78 92" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" />
                  {/* Centaur archer silhouette */}
                  <g fill="#1e293b">
                    <path d="M 38 68 C 34 68 28 72 24 85 C 28 85 32 81 36 81 C 38 90 36 100 36 100 C 41 100 45 90 47 83 C 51 86 57 86 61 86 C 61 91 59 100 59 100 C 65 100 67 92 68 85 C 68 76 58 68 51 68 Z" />
                    <path d="M 24 85 C 20 90 18 97 18 103 C 20 100 22 94 24 89 Z" />
                    <path d="M 49 68 C 47 63 47 54 51 48 C 45 50 39 52 33 54 C 29 48 31 44 35 44 C 41 46 47 48 53 49 C 55 44 59 40 63 40 C 67 40 68 46 66 50 C 68 50 75 49 81 48 C 79 52 73 54 67 54 C 65 60 61 66 55 69 Z" />
                    <path d="M 81 48 L 87 48 M 81 34 C 88 40 88 56 81 62" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
                    <path d="M 55 49 L 89 49" stroke="#009639" stroke-width="2" stroke-linecap="round" />
                    <polygon points="89,49 85,46 85,52" fill="#009639" />
                  </g>
                </svg>
                <div class="rx-print-logo-text">
                  <span class="rx-logo-title">{nameClinic}</span>
                  <span class="rx-logo-subtitle">Clinique & Urgences</span>
                </div>
              </div>
              <div class="rx-print-clinic-details">
                <div>📍 {addressClinic}</div>
                <div>📞 {phoneClinic} &nbsp;|&nbsp; ✉ {emailClinic}</div>
              </div>
            </div>

            <div class="rx-print-doctor-block">
              <div class="rx-doc-name">Dr {docName}</div>
              <div class="rx-doc-title">Spécialité : {docService}</div>
              <div class="rx-doc-subtitle">Établissement Hospitalier Centaur</div>
            </div>
          </div>

          <div class="rx-print-divider" />

          {/* Title Block */}
          <div class="rx-print-title-container">
            <div class="rx-print-title-badge">ORDONNANCE</div>
            <div class="rx-print-prescription-number">N° OR-{rxNumberStr}</div>
          </div>

          {/* Patient Card */}
          <div class="rx-print-patient-card">
            <div class="rx-patient-card-col">
              <div class="rx-patient-field">
                <span class="rx-patient-label">Patient :</span>
                <span class="rx-patient-value">{p ? `${p.last_name.toUpperCase()} ${p.first_name}` : '—'}</span>
              </div>
              <div class="rx-patient-field">
                <span class="rx-patient-label">Âge :</span>
                <span class="rx-patient-value">{ageStr}</span>
              </div>
              <div class="rx-patient-field">
                <span class="rx-patient-label">Sexe :</span>
                <span class="rx-patient-value">{genderStr}</span>
              </div>
            </div>
            <div class="rx-patient-card-col rx-align-right">
              <div class="rx-patient-field">
                <span class="rx-patient-label">Date d'édition :</span>
                <span class="rx-patient-value">{formatPrescriptionDate(rx.prescribedAt)}</span>
              </div>
              {p?.patient_code && (
                <div class="rx-patient-field">
                  <span class="rx-patient-label">Code Patient :</span>
                  <span class="rx-patient-value">{p.patient_code}</span>
                </div>
              )}
            </div>
          </div>

          {/* Medications list */}
          <div class="rx-print-medications-section">
            <div class="rx-section-watermark">Rx</div>
            <div class="rx-medications-list">
              {meds.map((m, i) => (
                <div class="rx-medication-item" key={m.id || i}>
                  <div class="rx-medication-main-line">
                    <span class="rx-med-number">{i + 1}.</span>
                    <span class="rx-med-name">{m.name}</span>
                    {m.dosage && <span class="rx-med-dosage">({m.dosage})</span>}
                    {m.duration && (
                      <span class="rx-med-duration">
                        Durée : {m.duration}
                      </span>
                    )}
                  </div>
                  {m.frequency && (
                    <div class="rx-medication-sub-line">
                      <span>Posologie :</span> {m.frequency}
                    </div>
                  )}
                  {m.instructions && (
                    <div class="rx-medication-sub-line rx-instructions">
                      <span>Note :</span> {m.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes / Observations */}
          {userNotesText && (
            <div class="rx-print-notes-block">
              <div class="rx-notes-header">Observations :</div>
              <div class="rx-notes-content">{userNotesText}</div>
            </div>
          )}

          {/* Simplified Signature Block */}
          <div class="rx-print-signature-stamp-container rx-signature-simple-layout">
            <div class="rx-print-signature">
              <div class="rx-signature-header">Signature</div>
              <div class="rx-signature-space" />
            </div>
          </div>

          {/* Footer */}
          <div class="rx-print-footer">
            <span>N° d'agrément : {numAgrement}</span>
            <span class="rx-print-footer-spacer" />
            <span>Document généré par la plateforme Centaur Medical le {printedAt}</span>
          </div>
        </div>
      );
    };
  },
});
