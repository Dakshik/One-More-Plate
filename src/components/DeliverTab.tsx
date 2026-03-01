import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useApp } from '../lib/store';
import { Eyebrow, Divider } from './UI';
import RouteMap from './RouteMap';

const PAST_DELIVERIES = [
  { emoji: '🍕', restaurant: 'Iron Hill Brewery', detail: 'Feb 24 · 18 portions · Food Bank of DE' },
  { emoji: '🥗', restaurant: 'Caffe Gelato', detail: 'Feb 21 · 12 portions · Senior Center' },
  { emoji: '🍜', restaurant: 'Grain on the Main', detail: 'Feb 19 · 22 portions · UD Pantry' },
];

type RunPhase = 'to_restaurant' | 'to_shelter' | 'complete';
type StepStatus = 'done' | 'current' | 'pending';

interface RunStep {
  icon: string;
  title: string;
  sub: string;
  status: StepStatus;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function useCountdown(targetTime: Date | null) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!targetTime) return;
    const update = () => {
      const diff = targetTime.getTime() - Date.now();
      if (diff <= 0) { setRemaining('Now'); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}m ${secs}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [targetTime]);
  return remaining;
}

export default function DeliverTab() {
  const { activeRun, showToast, setActiveTab, updateStats } = useApp();
  const [phase, setPhase] = useState<RunPhase>('to_restaurant');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const pickupCountdown = useCountdown(activeRun?.estimatedPickupTime ?? null);
  const deliveryCountdown = useCountdown(activeRun?.estimatedDeliveryTime ?? null);

  useEffect(() => {
    if (activeRun && navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationLoading(false);
        },
        () => {
          setLocationError(true);
          setLocationLoading(false);
        },
        { enableHighAccuracy: true }
      );
    }
  }, [activeRun]);

  useEffect(() => () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  const openMapsDirections = (dest: { lat: number; lng: number }, label: string) => {
    let url: string;
    if (userLocation) {
      url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${dest.lat},${dest.lng}&travelmode=driving&dir_action=navigate`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving&dir_action=navigate`;
    }
    window.open(url, '_blank');
    showToast(`🗺️ Opening directions to ${label}`);
  };

  const handlePhotoUpload = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    const preview = URL.createObjectURL(file);
    setPhotoPreviewUrl(preview);
    setPhotoUploaded(true);
    showToast('📸 Photo captured!');
    event.target.value = '';
  };

  const handlePickupConfirmed = () => {
    if (!activeRun) return;
    setPhase('to_shelter');
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setPhotoUploaded(false);
    showToast('✅ Pickup confirmed — heading to shelter!');
    setTimeout(() => openMapsDirections(activeRun.shelter.location, activeRun.shelter.name), 800);
  };

  const handleCompleteRun = () => {
    setPhase('complete');
    updateStats({ mealsThisWeek: activeRun?.post.portions ?? 10, kgSaved: 5, co2Avoided: 10 });
    showToast('🎉 Run complete! Amazing work Dakshi.');
    setTimeout(() => setActiveTab('account'), 2000);
  };

  if (!activeRun) {
    return (
      <div className="body">
        <div className="empty" style={{ paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>
            No active run
          </div>
          <div style={{ fontSize: 13, color: 'var(--warm-grey)', lineHeight: 1.6 }}>
            Go to the <strong>Available</strong> tab<br />and claim a pickup to start.
          </div>
        </div>
      </div>
    );
  }

  const dest = phase === 'to_restaurant'
    ? activeRun.post.restaurantLocation
    : activeRun.shelter.location;

  const destLabel = phase === 'to_restaurant'
    ? activeRun.post.restaurantName
    : activeRun.shelter.name;

  const steps: RunStep[] = phase === 'to_restaurant' ? [
    { icon: '✅', title: 'Run accepted', sub: `Accepted at ${formatTime(activeRun.acceptedAt)}`, status: 'done' },
    { icon: '🚗', title: `Drive to ${activeRun.post.restaurantName}`, sub: `${activeRun.post.restaurantAddress} · ETA ${pickupCountdown}`, status: 'current' },
    { icon: '📦', title: 'Collect food', sub: `${activeRun.post.portions} portions · ${activeRun.post.condition} · by ${activeRun.post.pickupBy}`, status: 'pending' },
    { icon: '🏠', title: `Drop off at ${activeRun.shelter.name}`, sub: activeRun.shelter.address, status: 'pending' },
    { icon: '✔️', title: 'Complete run', sub: 'Mark as done', status: 'pending' },
  ] : phase === 'to_shelter' ? [
    { icon: '✅', title: 'Run accepted', sub: `Accepted at ${formatTime(activeRun.acceptedAt)}`, status: 'done' },
    { icon: '✅', title: `Collected from ${activeRun.post.restaurantName}`, sub: `${activeRun.post.portions} portions picked up`, status: 'done' },
    { icon: '🚗', title: `Drive to ${activeRun.shelter.name}`, sub: `${activeRun.shelter.address} · ETA ${deliveryCountdown}`, status: 'current' },
    { icon: '📸', title: 'Drop off & confirm', sub: 'Take a photo at the shelter', status: 'pending' },
    { icon: '✔️', title: 'Complete run', sub: 'Mark as done', status: 'pending' },
  ] : [
    { icon: '✅', title: 'Run accepted', sub: formatTime(activeRun.acceptedAt), status: 'done' },
    { icon: '✅', title: `Collected from ${activeRun.post.restaurantName}`, sub: `${activeRun.post.portions} portions`, status: 'done' },
    { icon: '✅', title: `Delivered to ${activeRun.shelter.name}`, sub: 'Food delivered', status: 'done' },
    { icon: '✅', title: 'Photo confirmed', sub: 'Delivery verified', status: 'done' },
    { icon: '🎉', title: 'Run complete!', sub: 'Thank you Dakshi!', status: 'done' },
  ];

  return (
    <>
      <div className="run-hero" style={{
        background: phase === 'to_shelter' ? 'var(--sage)' :
                    phase === 'complete' ? 'var(--ink)' : 'var(--terracotta)'
      }}>
        <div className="run-status-label">
          {phase === 'to_restaurant' ? 'Active Run · Head to Restaurant' :
           phase === 'to_shelter' ? 'Active Run · Head to Shelter' : 'Run Complete!'}
        </div>
        <div className="run-status-main">
          {phase === 'to_restaurant' ? activeRun.post.restaurantName :
           phase === 'to_shelter' ? activeRun.shelter.name : 'Amazing work 🎉'}
        </div>
        <div className="run-status-sub">
          {phase === 'to_restaurant'
            ? `${activeRun.post.portions} portions · by ${activeRun.post.pickupBy} · ETA ${pickupCountdown}`
            : phase === 'to_shelter'
            ? `Drop off ${activeRun.post.portions} portions · ETA ${deliveryCountdown}`
            : 'Delivery confirmed · +1 run added to your profile'}
        </div>
      </div>

      <div className="body" style={{ paddingTop: 16 }}>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelected}
          style={{ display: 'none' }}
        />

        <div className="route-card">
          <div className="route-map">
            {locationLoading ? (
              <div className="map-fallback">
                <div className="plate-spin" style={{ fontSize: 28 }}>🍽️</div>
                <div style={{ fontSize: 12, color: 'var(--warm-grey)' }}>Getting your location…</div>
              </div>
            ) : (
              <RouteMap
                origin={userLocation ?? activeRun.volunteer.location}
                destination={dest}
                volunteerLocation={userLocation ?? activeRun.volunteer.location}
                originLabel="You"
                destinationLabel={destLabel}
              />
            )}
          </div>
          <div className="route-details">
            <div className="route-stat">
              <div className="route-stat-n">
                {phase === 'to_restaurant' ? activeRun.distanceToRestaurant : activeRun.distanceToShelter}
              </div>
              <div className="route-stat-l">Miles</div>
            </div>
            <div className="route-stat">
              <div className="route-stat-n">
                {phase === 'to_restaurant' ? pickupCountdown : deliveryCountdown}
              </div>
              <div className="route-stat-l">ETA</div>
            </div>
            <div className="route-stat">
              <div className="route-stat-n">{activeRun.post.portions}</div>
              <div className="route-stat-l">Portions</div>
            </div>
          </div>
        </div>

        {phase !== 'complete' && (
          <button
            className={`btn ${phase === 'to_shelter' ? 'btn-sage' : ''}`}
            onClick={() => openMapsDirections(dest, destLabel)}
            style={{ marginBottom: 10 }}
          >
            🗺️ Get directions to {destLabel}
          </button>
        )}

        {locationError && (
          <div style={{ fontSize: 12, color: 'var(--terracotta)', marginBottom: 12, textAlign: 'center' }}>
            ⚠️ Enable location in browser settings for live GPS
          </div>
        )}
        {userLocation && (
          <div style={{ fontSize: 11, color: 'var(--sage)', marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>
            📍 Live location active — directions from your position
          </div>
        )}

        {phase === 'to_restaurant' && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--warm-grey)', marginBottom: 8 }}>Pickup details</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{activeRun.post.restaurantName}</div>
            <div style={{ fontSize: 12, color: 'var(--warm-grey)', marginBottom: 8 }}>{activeRun.post.restaurantAddress}</div>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic', fontSize: 14, color: 'var(--ink2)', marginBottom: 8 }}>{activeRun.post.foodDescription}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="chip chip-hot">{activeRun.post.portions} portions</span>
              <span className="chip chip-urgent">⏰ By {activeRun.post.pickupBy}</span>
              <span className="chip">{activeRun.post.condition === 'hot' ? '🔥 Hot' : '♨️ Warm'}</span>
            </div>
          </div>
        )}

        {phase === 'to_shelter' && (
          <div className="card" style={{ marginBottom: 14, borderColor: 'var(--sage)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: 8 }}>Drop-off details</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{activeRun.shelter.name}</div>
            <div style={{ fontSize: 12, color: 'var(--warm-grey)', marginBottom: 8 }}>{activeRun.shelter.address}</div>
            <div style={{ fontSize: 13, color: 'var(--ink2)' }}>Delivering <strong>{activeRun.post.portions} portions</strong> from {activeRun.post.restaurantName}</div>
          </div>
        )}

        <Eyebrow>Run progress</Eyebrow>
        <div className="steps-list" style={{ marginBottom: 16 }}>
          {steps.map((step, i) => (
            <div key={i} className="step-row">
              <div className={`step-icon ${step.status}`}>{step.icon}</div>
              <div className="step-info">
                <div className="step-title">{step.title}</div>
                <div className="step-sub">{step.sub}</div>
              </div>
              <div className={`step-badge ${step.status}`}>
                {step.status === 'done' ? 'Done' : step.status === 'current' ? 'Now' : 'Next'}
              </div>
            </div>
          ))}
        </div>

        {phase === 'to_restaurant' && (
          <>
            <Eyebrow>Confirm you collected the food</Eyebrow>
            <div className={`photo-upload ${photoUploaded ? 'uploaded' : ''}`} onClick={!photoUploaded ? handlePhotoUpload : undefined}>
              <div className="photo-icon">{photoUploaded ? '✅' : '📸'}</div>
              <div className="photo-label">{photoUploaded ? 'Photo confirmed' : 'Take a photo of the food'}</div>
              <div className="photo-sub">{photoUploaded ? 'Tap below — shelter directions open automatically' : 'Confirms you picked up the food'}</div>
              {photoPreviewUrl && (
                <img
                  src={photoPreviewUrl}
                  alt="Pickup proof"
                  style={{ width: '100%', maxWidth: 260, borderRadius: 8, marginTop: 10, border: '1px solid var(--border)' }}
                />
              )}
            </div>
            <button className="btn btn-sage" onClick={handlePickupConfirmed} disabled={!photoUploaded} style={{ opacity: photoUploaded ? 1 : 0.4 }}>
              ✅ Food collected — open shelter directions →
            </button>
          </>
        )}

        {phase === 'to_shelter' && (
          <>
            <Eyebrow>Confirm delivery at shelter</Eyebrow>
            <div className={`photo-upload ${photoUploaded ? 'uploaded' : ''}`} onClick={!photoUploaded ? handlePhotoUpload : undefined}>
              <div className="photo-icon">{photoUploaded ? '✅' : '📸'}</div>
              <div className="photo-label">{photoUploaded ? 'Delivery confirmed' : 'Take a photo at the shelter'}</div>
              <div className="photo-sub">{photoUploaded ? 'Tap below to complete the run' : 'Proves food was delivered safely'}</div>
              {photoPreviewUrl && (
                <img
                  src={photoPreviewUrl}
                  alt="Delivery proof"
                  style={{ width: '100%', maxWidth: 260, borderRadius: 8, marginTop: 10, border: '1px solid var(--border)' }}
                />
              )}
            </div>
            <button className="btn" onClick={handleCompleteRun} disabled={!photoUploaded} style={{ opacity: photoUploaded ? 1 : 0.4 }}>
              🎉 Mark run as complete
            </button>
          </>
        )}

        {phase === 'complete' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>Run complete, Dakshi!</div>
            <div style={{ fontSize: 13, color: 'var(--warm-grey)', lineHeight: 1.6 }}>{activeRun.post.portions} meals rescued · heading to your profile…</div>
          </div>
        )}

        <Divider />
        <Eyebrow>Your past deliveries</Eyebrow>
        {PAST_DELIVERIES.map((d, i) => (
          <div key={i} className="delivery-row">
            <div className="del-icon">{d.emoji}</div>
            <div className="del-info">
              <div className="del-rest">{d.restaurant}</div>
              <div className="del-detail">{d.detail}</div>
            </div>
            <div className="del-badge">✓ Done</div>
          </div>
        ))}
      </div>
    </>
  );
}
