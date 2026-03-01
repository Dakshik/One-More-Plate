import { useState } from 'react';
import { useApp } from '../lib/store';
import { GeminiCard, Tag, Button } from './UI';
import type { VehicleType } from '../types';

const VEHICLES: { id: VehicleType; icon: string; label: string }[] = [
  { id: 'walking', icon: '🚶', label: 'Walking' },
  { id: 'bicycle', icon: '🚲', label: 'Bicycle' },
  { id: 'car', icon: '🚗', label: 'Car' },
];

const AVAILABILITY_OPTIONS = ['Mon–Fri eve', 'Weekends', 'Late nights', 'Mornings', 'Afternoons', 'Anytime'];

export default function VolunteerTab() {
  const { showToast, setIsVolunteer, setActiveTab } = useApp();
  const [submitted, setSubmitted] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [maxDist, setMaxDist] = useState('2');
  const [vehicle, setVehicle] = useState<VehicleType>('car');
  const [availability, setAvailability] = useState<string[]>(['Weekends', 'Late nights']);
  const [profileText, setProfileText] = useState('');

  const toggleAvail = (opt: string) => {
    setAvailability(prev =>
      prev.includes(opt) ? prev.filter(a => a !== opt) : [...prev, opt]
    );
  };

  const handleSubmit = () => {
    const name = firstName || 'Alex';
    const distLabel = maxDist === 'any' ? 'any distance' : `${maxDist} mile${parseInt(maxDist) > 1 ? 's' : ''}`;
    const vehicleLabel = VEHICLES.find(v => v.id === vehicle)?.label || vehicle;

    setProfileText(`You're registered as a volunteer driver in Newark, DE. Vehicle: ${vehicleLabel}. Max distance: ${distLabel}. Available: ${availability.join(', ') || 'Flexible'}. You'll receive SMS alerts when a pickup matches your profile — accept or decline each one freely.`);
    setSubmitted(true);
    setIsVolunteer(true);
    showToast(`Welcome aboard, ${name}!`);
  };

  if (submitted) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 24, color: 'var(--ink)', marginBottom: 10 }}>
          You're in.
        </div>
        <div style={{ fontSize: 14, color: 'var(--warm-grey)', lineHeight: 1.7, marginBottom: 28 }}>
          We'll send you an SMS alert<br />when there's a pickup nearby that<br />matches your availability.
        </div>
        <GeminiCard label="Your volunteer profile">
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink2)' }}>{profileText}</p>
          <div style={{ marginTop: 10 }}>
            <Tag variant="red">{VEHICLES.find(v => v.id === vehicle)?.icon} {VEHICLES.find(v => v.id === vehicle)?.label}</Tag>
            <Tag>Within {maxDist === 'any' ? 'any' : maxDist} miles</Tag>
            {availability.map(a => <Tag key={a} variant="green">{a}</Tag>)}
          </div>
        </GeminiCard>
        <Button onClick={() => setActiveTab('feed')}>See available pickups →</Button>
      </div>
    );
  }

  return (
    <>
      <div className="vol-hero">
        <div className="vol-hero-title">Become a volunteer driver.</div>
        <div className="vol-hero-sub">
          Takes 2 minutes. Get notified when food is nearby.<br />You choose when and how often.
        </div>
      </div>
      <div className="body">
        <div className="field-row">
          <div className="field">
            <label>First name</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Alex" />
          </div>
          <div className="field">
            <label>Last name</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Morgan" />
          </div>
        </div>
        <div className="field">
          <label>SMS number</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (302) 555-0123" />
        </div>
        <div className="field">
          <label>Max delivery distance</label>
          <select value={maxDist} onChange={e => setMaxDist(e.target.value)}>
            <option value="1">Within 1 mile</option>
            <option value="2">Within 2 miles</option>
            <option value="5">Within 5 miles</option>
            <option value="10">Within 10 miles</option>
            <option value="any">Any distance</option>
          </select>
        </div>
        <div className="field">
          <label>How do you travel?</label>
          <div className="vehicle-grid">
            {VEHICLES.map(v => (
              <div
                key={v.id}
                className={`vehicle-opt ${vehicle === v.id ? 'selected' : ''}`}
                onClick={() => setVehicle(v.id)}
              >
                <div className="vehicle-icon">{v.icon}</div>
                <div className="vehicle-label">{v.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="field">
          <label>When are you usually free?</label>
          <div className="avail-grid">
            {AVAILABILITY_OPTIONS.map(opt => (
              <div
                key={opt}
                className={`avail-opt ${availability.includes(opt) ? 'selected' : ''}`}
                onClick={() => toggleAvail(opt)}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
        <Button onClick={handleSubmit}>Sign me up →</Button>
      </div>
    </>
  );
}
