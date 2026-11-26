/** Bump the version when the terms change: users are asked to agree again before sharing. */
export const TERMS_VERSION = '2026-11-16';
export const TERMS_CONTACT = 'Urban Agri-Care team (Group 7, Workshop 2, UTeM)';

export const termsSections: { title: string; body: string }[] = [
  { title: 'What the app does', body: 'Urban Agri-Care suggests what may be wrong with a leaf using an AI model. Results can be wrong. They are guidance, not professional advice.' },
  { title: 'Your data stays on your phone', body: 'Plants, photos, notes and care plans are saved only on this device. There is no account.' },
  { title: 'Sharing a photo is optional', body: 'Only when you switch on "Share photo" for a correction, we receive: the leaf photo, the crop, the model\'s answer and confidence, and the answer you picked. We do not receive your name, contact details or location, and location data is removed from photos.' },
  { title: 'How shared photos are used', body: 'Shared photos are checked by an AI reviewer and by the team, then used to retrain the model so it gets more accurate. They are not sold or given to anyone else.' },
  { title: 'Your choices', body: 'You can withdraw consent here at any time; nothing more will be shared. To delete photos you already shared, contact the team below.' },
  { title: 'How long we keep it', body: 'Shared photos are kept until the end of the project, or until you ask us to delete them.' },
  { title: 'Changes and law', body: 'If these terms change, the app asks you again before sharing. We follow the consent and purpose rules of Malaysia\'s Personal Data Protection Act 2010.' },
];

export const hasConsent = (consent?: { version: string }) => consent?.version === TERMS_VERSION;
