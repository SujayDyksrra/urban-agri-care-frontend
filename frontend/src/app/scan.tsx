import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, Page } from '../components/Ui';
import PersistedPhoto from '../components/PersistedPhoto';
import PlantGrowthLoader from '../components/PlantGrowthLoader';
import { ApiError, apiMode } from '../services/api/client';
import { diagnosePhoto, toDiagnosis } from '../services/api/diagnose';
import { uid } from '../services/plants/resolve';
import { choosePhoto } from '../services/storage/photos';
import { useLocalStore } from '../services/storage/LocalStore';
import type { Diagnosis } from '../types/models';

export default function Scan() {
  return apiMode === 'live' ? <LiveScan /> : <DemoScan />;
}

/** Live: pick a photo, POST it to /diagnose, save the result (and the treatment it carries) and open it. */
function LiveScan() {
  const { update } = useLocalStore();
  const [photo, setPhoto] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const analyse = useCallback(async (uri: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError(''); setRunning(true);
    try {
      const result = await diagnosePhoto(uri, controller.signal);
      const { diagnosis, guidance } = toDiagnosis(result, uid('scan'), uri);
      await update((data) => ({ ...data, diagnoses: [...data.diagnoses, diagnosis], guidance: guidance ? [...data.guidance.filter((item) => item.id !== guidance.id), guidance] : data.guidance }));
      if (!controller.signal.aborted) router.replace({ pathname: '/result', params: { id: diagnosis.id } });
    } catch (cause) {
      console.error('[scan] save/navigate failed:', cause);
      if (controller.signal.aborted) return;
      setRunning(false);
      setError(cause instanceof ApiError ? cause.message : 'Could not save the result. Please retry.');
    }
  }, [update]);

  const pick = async (source: 'camera' | 'library') => {
    setError('');
    try {
      const uri = await choosePhoto(source);
      if (!uri) return;
      setPhoto(uri);
      void analyse(uri);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const cancel = () => { request.current?.abort(); setRunning(false); router.replace('/'); };

  return <Page title={running ? 'Analyzing Leaf' : 'Scan Leaf'} back>
    {photo ? <PersistedPhoto uri={photo} height={220} cover /> : null}
    {running ? <PlantGrowthLoader active stepMs={420} /> : null}
    {error ? <Banner tone="error" text={error} /> : null}
    {running ? <Button label="Cancel" icon="close" onPress={cancel} outline /> : <View style={{ gap: 10 }}>
      {photo && error ? <Button label="Retry" icon="refresh" onPress={() => void analyse(photo)} /> : null}
      <Button label="Take Photo" icon="camera-outline" onPress={() => void pick('camera')} outline={!!(photo && error)} />
      <Button label="Choose from Gallery" icon="images-outline" onPress={() => void pick('library')} outline />
    </View>}
  </Page>;
}

/** Mock mode: no network, a fixed sample diagnosis after one loader cycle. */
function DemoScan() {
  const { update } = useLocalStore();
  const [running, setRunning] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!running) return;
    let active = true;
    const timer = setTimeout(async () => {
      if (process.env.EXPO_PUBLIC_MOCK_SCAN_ERROR === '1') { if (active) { setRunning(false); setError('Demo analysis failed. Retry or return Home.'); } return; }
      const id = `demo-${Date.now()}`;
      const diagnosis: Diagnosis = { id, label: 'Tomato___Early_blight', crop: 'Tomato', condition: 'Early blight', status: 'Unhealthy', confidence: 0.92, createdAt: new Date().toISOString(), isMock: true };
      try { await update((data) => ({ ...data, diagnoses: [...data.diagnoses, diagnosis] })); if (active) router.replace({ pathname: '/result', params: { id } }); }
      catch { if (active) { setRunning(false); setError('Could not save demo diagnosis. Please retry.'); } }
    }, 3400); // one full growth cycle (8 × 420 ms) in demo mode
    return () => { active = false; clearTimeout(timer); };
  }, [running, update]);
  return <Page title="Analyzing Leaf" back>
    <PlantGrowthLoader active={running} stepMs={420} />
    {error ? <Banner tone="error" text={error} /> : null}
    <Button label={error ? 'Retry Demo' : 'Cancel'} icon={error ? 'refresh' : 'close'} onPress={() => error ? (setError(''), setRunning(true)) : router.replace('/')} outline />
  </Page>;
}
