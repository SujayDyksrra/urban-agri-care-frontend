import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Banner, Button, Card, goBack, Page, ui } from '../components/Ui';
import { TERMS_CONTACT, TERMS_VERSION, hasConsent, termsSections } from '../data/terms';
import { Dialog, useToast } from '../components/Motion';
import { useLocalStore } from '../services/storage/LocalStore';
import { font, theme, type, lineHeight } from '../theme';
import { formatDate } from '../utils/dates';

export default function Terms() {
  const { data, update } = useLocalStore();
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const toast = useToast();
  const agreed = hasConsent(data.consent);
  const agree = async () => {
    try { await update((old) => ({ ...old, consent: { version: TERMS_VERSION, acceptedAt: new Date().toISOString() } })); toast('Thanks! Sharing is on'); goBack(); }
    catch (cause) { setError(`Could not save: ${String(cause)}`); }
  };
  // Withdrawing stops future sharing: unsent corrections are taken out of the queue too.
  const withdraw = async () => {
    try { await update((old) => ({ ...old, consent: undefined, diagnoses: old.diagnoses.map((item) => item.correction && !item.correction.sentAt ? { ...item, correction: { ...item.correction, share: false } } : item) })); setConfirm(false); toast('Consent withdrawn'); }
    catch (cause) { setError(`Could not save: ${String(cause)}`); }
  };
  return <Page title="Terms" back>
    <Card>
      {termsSections.map((section, i) => <View key={section.title} style={i ? s.section : null}>
        <Text style={ui.serifMedium}>{section.title}</Text>
        <Text style={s.body}>{section.body}</Text>
      </View>)}
      <Text style={s.meta}>Contact: {TERMS_CONTACT}</Text>
      <Text style={s.meta}>Version {TERMS_VERSION}</Text>
    </Card>
    {error ? <Banner tone="error" text={error} /> : null}
    {agreed
      ? <><Banner tone="ok" text={`Agreed on ${formatDate(data.consent!.acceptedAt)}`} /><Button label="Withdraw Consent" icon="close-circle-outline" outline onPress={() => setConfirm(true)} /></>
      : <><Button label="I Agree" icon="checkmark" onPress={() => void agree()} /><Button label="Not Now" outline onPress={goBack} /></>}
    <Dialog visible={confirm} onClose={() => setConfirm(false)} icon="alert-circle" color={theme.danger} title="Withdraw consent?" message="No more photos will be shared. Photos already sent stay until you ask the team to delete them." actions={[
      { label: 'Withdraw', kind: 'danger', onPress: () => void withdraw() },
      { label: 'Keep Sharing', kind: 'plain', onPress: () => setConfirm(false) },
    ]} />
  </Page>;
}

const s = StyleSheet.create({
  section: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: theme.border },
  body: { color: theme.text, fontFamily: font.regular, fontSize: type.body, lineHeight: lineHeight(type.body), marginTop: 6 },
  meta: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, marginTop: 16 },
});
