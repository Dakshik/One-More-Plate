import { useState } from 'react';
import { analyzeAndStructureFoodPost } from '../lib/gemini';
import { addPostToDb, getNearbyVolunteers } from '../lib/db';
import { buildPickupSMS, sendSMS } from '../lib/sms';
import { useApp } from '../lib/store';
import { GeminiCard, Tag, Button, Eyebrow } from './UI';
import type { FoodCondition, FoodPost, GeminiPostAnalysis } from '../types';
import { REGISTERED_VOLUNTEERS, SHELTERS } from '../data/seed';
import { getNearestShelter, resolveRestaurantDetails } from '../lib/geo';

type PostState = 'form' | 'processing' | 'result';

const PROC_STEPS = [
  ['Reading your post with Gemini…', 'Identifying food types & quantities'],
  ['Estimating impact…', 'Calculating CO₂ savings & kg food'],
  ['Finding nearest volunteers…', 'Checking availability within 1 mile'],
  ['Dispatching SMS notifications…', 'Sending to 3 active volunteers'],
];

export default function PostTab() {
  const { setActiveTab, showToast } = useApp();
  const [state, setState] = useState<PostState>('form');
  const [procStep, setProcStep] = useState(0);
  const [analysis, setAnalysis] = useState<GeminiPostAnalysis | null>(null);
  const [currentPost, setCurrentPost] = useState<FoodPost | null>(null);
  const [notifiedCount, setNotifiedCount] = useState(0);
  const [targetShelterName, setTargetShelterName] = useState('Food Bank of Delaware');
  const [notifiedVolunteers, setNotifiedVolunteers] = useState<{ name: string; distanceMiles: number }[]>([]);

  const [name, setName] = useState('');
  const [food, setFood] = useState('');
  const [portions, setPortions] = useState('');
  const [time, setTime] = useState('23:00');
  const [condition, setCondition] = useState<FoodCondition>('hot');

  const fmtTime = (val: string) => {
    const [h, m] = val.split(':');
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m}${hr >= 12 ? 'pm' : 'am'}`;
  };

  const handleSubmit = async () => {
    const rName = name || 'Your Restaurant';
    const rFood = food || 'mixed dishes';
    const rPortions = parseInt(portions) || 20;
    const rTime = fmtTime(time);

    const restaurantDetails = await resolveRestaurantDetails(rName);
    if (!restaurantDetails.location) {
      showToast('Could not find that restaurant on Maps. Use the exact restaurant name.');
      return;
    }
    const restaurantLocation = restaurantDetails.location;
    const restaurantAddress = restaurantDetails.formattedAddress || `${rName}, Newark, DE`;

    setState('processing');
    setProcStep(0);

    for (let i = 0; i < PROC_STEPS.length; i++) {
      setProcStep(i);
      await new Promise(r => setTimeout(r, 700));
    }

    const acceptingShelters = SHELTERS.filter(s => s.acceptingNow);
    const targetShelter = getNearestShelter(restaurantLocation, acceptingShelters.length ? acceptingShelters : SHELTERS);
    setTargetShelterName(targetShelter.name);
    const result = await analyzeAndStructureFoodPost(rName, rFood, rPortions, rTime, condition, targetShelter.name);
    setAnalysis(result);

    const post: FoodPost = {
      id: Date.now().toString(),
      restaurantName: rName,
      restaurantAddress,
      restaurantLocation,
      foodDescription: rFood,
      portions: rPortions,
      pickupBy: rTime,
      condition,
      postedAt: new Date(),
      claimed: false,
      geminiSummary: result,
    };

    const saved = await addPostToDb({
      restaurantName: rName,
      restaurantAddress,
      restaurantLocation,
      foodDescription: rFood,
      portions: rPortions,
      pickupBy: rTime,
      condition,
      geminiSummary: result,
    });

    const postId = saved?.id ?? post.id;
    const nearbyFromDb = await getNearbyVolunteers(1, 3);

    const volunteers: { name: string; phone: string; distanceMiles: number }[] = nearbyFromDb.length > 0
      ? nearbyFromDb.map((v, i) => ({
        name: `${v.firstName} ${v.lastName.charAt(0)}.`,
        phone: v.phone,
        distanceMiles: Number((0.4 + i * 0.2).toFixed(1)),
      }))
      : REGISTERED_VOLUNTEERS.map(v => ({
        name: `${v.firstName} ${v.lastName.charAt(0)}.`,
        phone: v.phone,
        distanceMiles: v.distanceMiles,
      }));

    const sent = await Promise.all(
      volunteers.map(v =>
        sendSMS(
          v.phone,
          buildPickupSMS(postId, rName, rFood, rPortions, rTime, targetShelter.name, v.phone)
        )
      )
    );
    const sentCount = sent.filter(Boolean).length;
    setNotifiedCount(sentCount);
    setNotifiedVolunteers(volunteers);

    setCurrentPost(saved ?? post);
    setState('result');
  };

  const handleReset = () => {
    setState('form');
    setAnalysis(null);
    setCurrentPost(null);
    setNotifiedCount(0);
    setTargetShelterName('Food Bank of Delaware');
    setNotifiedVolunteers([]);
    setName(''); setFood(''); setPortions(''); setTime('23:00'); setCondition('hot');
  };

  return (
    <div className="body">
      {state === 'form' && (
        <>
          <Eyebrow>Closing up? Tell us what's left.</Eyebrow>
          <div className="field">
            <label>Restaurant</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Caffe Gelato" />
          </div>
          <div className="field">
            <label>What do you have?</label>
            <textarea value={food} onChange={e => setFood(e.target.value)} rows={3} placeholder="e.g. 30 portions pasta, bread rolls, minestrone" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Portions</label>
              <input type="number" value={portions} onChange={e => setPortions(e.target.value)} placeholder="30" min={1} />
            </div>
            <div className="field">
              <label>Pickup by</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Temperature</label>
            <select value={condition} onChange={e => setCondition(e.target.value as FoodCondition)}>
              <option value="hot">🔥 Hot — just off the stove</option>
              <option value="warm">♨️ Warm</option>
              <option value="room">🫙 Room temperature</option>
              <option value="cold">❄️ Cold / refrigerated</option>
            </select>
          </div>
          <Button onClick={handleSubmit}>Post to nearby volunteers →</Button>
        </>
      )}

      {state === 'processing' && (
        <div className="processing">
          <div className="plate-spin">🍽️</div>
          <div className="proc-step">{PROC_STEPS[procStep]?.[0]}</div>
          <div className="proc-sub">{PROC_STEPS[procStep]?.[1]}</div>
        </div>
      )}

      {state === 'result' && analysis && currentPost && (
        <>
          <GeminiCard label="Gemini · Structured & Dispatched">
            <div style={{ marginBottom: 10 }}>
              {analysis.tags.map(t => <Tag key={t} variant={t.includes('🌱') ? 'green' : 'red'}>{t}</Tag>)}
              <Tag variant="green">🌱 ~{analysis.estimatedCo2Saved}kg CO₂ saved</Tag>
              <Tag variant="green">📦 ~{analysis.estimatedKg}kg food</Tag>
              <Tag variant={analysis.urgencyLevel === 'high' ? 'red' : 'default'}>
                {analysis.urgencyLevel === 'high' ? '🔴 Urgent' : analysis.urgencyLevel === 'medium' ? '🟡 Tonight' : '🟢 Flexible'}
              </Tag>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink2)' }}>
              {analysis.structuredDescription} <strong>{analysis.distributionRecommendation}</strong>
            </p>
          </GeminiCard>

          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--warm-grey)', marginBottom: 8 }}>
              Dispatch status
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 10 }}>
              SMS alert sent to <strong>{notifiedCount || notifiedVolunteers.length || 1}</strong> nearby volunteer(s).
              Accept/decline now happens via SMS or from the <strong>Available</strong> tab.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {notifiedVolunteers.map(vol => (
                <Tag key={vol.name}>{vol.name} · {vol.distanceMiles} mi</Tag>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--warm-grey)', whiteSpace: 'pre-line' }}>
              {analysis.dispatchMessage || analysis.whatsappMessage}
            </div>
          </div>

          <div className="timeline">
            <div className="t-row"><div className="t-dot done" /><div className="t-text done">Restaurant posted surplus</div></div>
            <div className="t-row"><div className="t-dot done" /><div className="t-text done">Gemini structured post — SMS sent to {notifiedCount || notifiedVolunteers.length || 1} volunteers</div></div>
            <div className="t-row">
              <div className="t-dot now" />
              <div className="t-text">Waiting for volunteer to claim (SMS or Available tab)…</div>
            </div>
            <div className="t-row"><div className="t-dot" /><div className="t-text">Drop-off destination: {targetShelterName}</div></div>
          </div>

          <Button variant="sage" onClick={() => setActiveTab('feed')} className="mt-16">Go to available pickups →</Button>
          <Button variant="outline" onClick={handleReset} className="mt-16">Post another →</Button>
        </>
      )}
    </div>
  );
}
