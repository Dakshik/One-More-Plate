import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useApp } from '../lib/store';
import { Eyebrow, Divider } from './UI';
import RouteMap from './RouteMap';
import { distanceMiles } from '../lib/geo';

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

function fallbackEtaMinutes(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): number {
  const miles = distanceMiles(origin, destination);
  const avgCityMph = 24;
  return Math.max(2, Math.round((miles / avgCityMph) * 60));
}

async function getDrivingEtaMinutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<number> {
  if (window.google?.maps?.DirectionsService) {
    const directionsService = new window.google.maps.DirectionsService();
    const eta = await new Promise<number | null>((resolve) => {
      directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status !== 'OK' || !result?.routes?.[0]?.legs?.[0]?.duration?.value) {
            resolve(null);
            return;
          }
          resolve(Math.max(1, Math.round(result.routes[0].legs[0].duration.value / 60)));
        }
      );
    });
    if (eta !== null) return eta;
  }

  return fallbackEtaMinutes(origin, destination);
}

export default function DeliverTab() {
  const { activeRun, showToast, setActiveTab, setActiveRun, clearRunMessages, updateStats } = useApp();
  const [phase, setPhase] = useState<RunPhase>('to_restaurant');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>('');
  const [photoSource, setPhotoSource] = useState<'live' | 'attachment' | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const livePhotoInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const completionTimeoutRef = useRef<number | null>(null);
  const dest = !activeRun
    ? null
    : phase === 'to_restaurant'
      ? activeRun.post.restaurantLocation
      : activeRun.shelter.location;
  const destLabel = !activeRun
    ? ''
    : phase === 'to_restaurant'
      ? activeRun.post.restaurantName
      : activeRun.shelter.name;
  const routeOrigin = activeRun ? (userLocation ?? activeRun.volunteer.location) : null;
  const liveMiles = routeOrigin && dest ? Number(distanceMiles(routeOrigin, dest).toFixed(1)) : 0;
  const etaLabel = etaLoading ? '...' : etaMinutes !== null ? `${etaMinutes} min` : 'N/A';

  useEffect(() => {
    if (!activeRun) {
      setLocationLoading(false);
      setUserLocation(null);
      return;
    }
    if (navigator.geolocation) {
      setLocationLoading(true);
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationLoading(false);
        },
        () => {
          setLocationError(true);
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [activeRun?.id]);

  useEffect(() => {
    setPhase('to_restaurant');
    setPhotoUploaded(false);
    setLocationError(false);
    setPhotoName('');
    setPhotoSource(null);
    stopCameraStream();
    setCameraOpen(false);
    setEtaMinutes(null);
    setEtaLoading(false);
    setPhotoPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [activeRun?.id]);

  useEffect(() => () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  useEffect(() => () => {
    if (completionTimeoutRef.current) {
      window.clearTimeout(completionTimeoutRef.current);
    }
  }, []);

  const stopCameraStream = () => {
    const stream = cameraStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
  };

  useEffect(() => () => {
    stopCameraStream();
  }, []);

  useEffect(() => {
    if (!activeRun || !routeOrigin || !dest || phase === 'complete') {
      setEtaLoading(false);
      setEtaMinutes(null);
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;
    const updateEta = async () => {
      setEtaLoading(true);
      const minutes = await getDrivingEtaMinutes(routeOrigin, dest);
      if (cancelled) return;
      setEtaMinutes(minutes);
      setEtaLoading(false);
    };

    void updateEta();
    intervalId = window.setInterval(() => void updateEta(), 45000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [activeRun?.id, phase, routeOrigin?.lat, routeOrigin?.lng, dest?.lat, dest?.lng]);

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

  const handleLivePhotoUpload = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('Camera preview unsupported here. Falling back to file picker.');
      livePhotoInputRef.current?.click();
      return;
    }

    setCameraLoading(true);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraOpen(false);
      showToast('Camera access blocked. Allow permissions or attach photo instead.');
      livePhotoInputRef.current?.click();
    } finally {
      setCameraLoading(false);
    }
  };

  const handleAttachmentUpload = () => {
    attachmentInputRef.current?.click();
  };

  const handlePhotoSelected = (event: ChangeEvent<HTMLInputElement>, source: 'live' | 'attachment') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    const preview = URL.createObjectURL(file);
    setPhotoPreviewUrl(preview);
    setPhotoName(file.name || 'photo.jpg');
    setPhotoSource(source);
    setPhotoUploaded(true);
    showToast(source === 'live' ? '📸 Live photo captured!' : '📎 Photo attached!');
    event.target.value = '';
  };

  const closeCamera = () => {
    stopCameraStream();
    setCameraOpen(false);
  };

  const handleCaptureFromCamera = async () => {
    const video = videoRef.current;
    if (!video) return;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (!width || !height) return;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      showToast('Could not capture image. Try again.');
      return;
    }

    const file = new File([blob], `live-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    const preview = URL.createObjectURL(file);
    setPhotoPreviewUrl(preview);
    setPhotoName(file.name);
    setPhotoSource('live');
    setPhotoUploaded(true);
    closeCamera();
    showToast('📸 Live photo captured!');
  };

  const handlePickupConfirmed = () => {
    if (!activeRun) return;
    setPhase('to_shelter');
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setPhotoName('');
    setPhotoSource(null);
    setPhotoUploaded(false);
    closeCamera();
    showToast('✅ Pickup confirmed — heading to shelter!');
    setTimeout(() => openMapsDirections(activeRun.shelter.location, activeRun.shelter.name), 800);
  };

  const handleCompleteRun = () => {
    if (!activeRun) return;
    setPhase('complete');
    updateStats({ mealsThisWeek: activeRun.post.portions, kgSaved: 5, co2Avoided: 10 });
    showToast('🎉 Run complete! Amazing work Dakshi.');
    completionTimeoutRef.current = window.setTimeout(() => {
      clearRunMessages();
      setActiveRun(null);
      setActiveTab('feed');
      showToast('Run completed. Claim the next pickup when ready.');
    }, 2000);
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

  const steps: RunStep[] = phase === 'to_restaurant' ? [
    { icon: '✅', title: 'Run accepted', sub: `Accepted at ${formatTime(activeRun.acceptedAt)}`, status: 'done' },
    { icon: '🚗', title: `Drive to ${activeRun.post.restaurantName}`, sub: `${activeRun.post.restaurantAddress} · ETA ${etaLabel}`, status: 'current' },
    { icon: '📦', title: 'Collect food', sub: `${activeRun.post.portions} portions · ${activeRun.post.condition} · by ${activeRun.post.pickupBy}`, status: 'pending' },
    { icon: '🏠', title: `Drop off at ${activeRun.shelter.name}`, sub: activeRun.shelter.address, status: 'pending' },
    { icon: '✔️', title: 'Complete run', sub: 'Mark as done', status: 'pending' },
  ] : phase === 'to_shelter' ? [
    { icon: '✅', title: 'Run accepted', sub: `Accepted at ${formatTime(activeRun.acceptedAt)}`, status: 'done' },
    { icon: '✅', title: `Collected from ${activeRun.post.restaurantName}`, sub: `${activeRun.post.portions} portions picked up`, status: 'done' },
    { icon: '🚗', title: `Drive to ${activeRun.shelter.name}`, sub: `${activeRun.shelter.address} · ETA ${etaLabel}`, status: 'current' },
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
            ? `${activeRun.post.portions} portions · by ${activeRun.post.pickupBy} · ETA ${etaLabel}`
            : phase === 'to_shelter'
            ? `Drop off ${activeRun.post.portions} portions · ETA ${etaLabel}`
            : 'Delivery confirmed · +1 run added to your profile'}
        </div>
      </div>

      <div className="body" style={{ paddingTop: 16 }}>
        <input
          ref={livePhotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handlePhotoSelected(e, 'live')}
          style={{ display: 'none' }}
        />
        <input
          ref={attachmentInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handlePhotoSelected(e, 'attachment')}
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
                destination={dest!}
                volunteerLocation={userLocation ?? activeRun.volunteer.location}
                originLabel="You"
                destinationLabel={destLabel}
              />
            )}
          </div>
          <div className="route-details">
            <div className="route-stat">
              <div className="route-stat-n">{liveMiles}</div>
              <div className="route-stat-l">Miles</div>
            </div>
            <div className="route-stat">
              <div className="route-stat-n">{etaLabel}</div>
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
            onClick={() => openMapsDirections(dest!, destLabel)}
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
            <div className={`photo-upload ${photoUploaded ? 'uploaded' : ''}`}>
              <div className="photo-icon">{photoUploaded ? '✅' : '📸'}</div>
              <div className="photo-label">{photoUploaded ? 'Proof photo ready' : 'Add proof photo of the food'}</div>
              <div className="photo-sub">{photoUploaded ? 'Tap below — shelter directions open automatically' : 'Confirms you picked up the food'}</div>
              {!photoUploaded && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn btn-outline" onClick={handleLivePhotoUpload}>📸 Take live photo</button>
                  <button type="button" className="btn btn-outline" onClick={handleAttachmentUpload}>📎 Attach photo</button>
                </div>
              )}
              {photoUploaded && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--warm-grey)' }}>
                  {photoSource === 'live' ? 'Source: Live capture' : 'Source: Attachment'} · {photoName}
                </div>
              )}
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
            <div className={`photo-upload ${photoUploaded ? 'uploaded' : ''}`}>
              <div className="photo-icon">{photoUploaded ? '✅' : '📸'}</div>
              <div className="photo-label">{photoUploaded ? 'Delivery proof ready' : 'Take or attach a shelter photo'}</div>
              <div className="photo-sub">{photoUploaded ? 'Tap below to complete the run' : 'Proves food was delivered safely'}</div>
              {!photoUploaded && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn btn-outline" onClick={handleLivePhotoUpload}>📸 Take live photo</button>
                  <button type="button" className="btn btn-outline" onClick={handleAttachmentUpload}>📎 Attach photo</button>
                </div>
              )}
              {photoUploaded && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--warm-grey)' }}>
                  {photoSource === 'live' ? 'Source: Live capture' : 'Source: Attachment'} · {photoName}
                </div>
              )}
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

        {cameraOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}>
            <div style={{
              width: '100%',
              maxWidth: 420,
              background: 'var(--ink)',
              borderRadius: 10,
              padding: 12,
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Live camera capture
              </div>
              <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: 300, objectFit: 'cover' }}
                />
              </div>
              {cameraLoading && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>
                  Starting camera…
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={closeCamera}>
                  Cancel
                </button>
                <button type="button" className="btn" onClick={() => void handleCaptureFromCamera()} disabled={cameraLoading}>
                  Capture photo
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>Run complete, Dakshi!</div>
            <div style={{ fontSize: 13, color: 'var(--warm-grey)', lineHeight: 1.6 }}>{activeRun.post.portions} meals rescued · resetting for your next run…</div>
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
