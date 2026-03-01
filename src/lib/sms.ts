export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const endpoint = `${apiBase}/api/send-sms`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: `+1${to.replace(/\D/g, '')}`, message }),
    });

    const text = await response.text();
    let data: { error?: string } = {};
    if (text) {
      try {
        data = JSON.parse(text) as { error?: string };
      } catch {
        data = {};
      }
    }
    if (!response.ok) {
      console.error('SMS failed:', data.error || `HTTP ${response.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('SMS error:', err);
    return false;
  }
}

export async function sendBulkSMS(numbers: string[], message: string): Promise<number> {
  const uniqueNumbers = Array.from(new Set(numbers.filter(Boolean)));
  const results = await Promise.all(uniqueNumbers.map(number => sendSMS(number, message)));
  return results.filter(Boolean).length;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function buildClaimLink(postId: string, phone?: string): string {
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const phoneParam = phone ? `&phone=${encodeURIComponent(normalizePhone(phone))}` : '';
  return `${baseUrl}/?claim=${encodeURIComponent(postId)}${phoneParam}`;
}

export function buildDeclineLink(postId: string, phone?: string): string {
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const phoneParam = phone ? `&phone=${encodeURIComponent(normalizePhone(phone))}` : '';
  return `${baseUrl}/?decline=${encodeURIComponent(postId)}${phoneParam}`;
}
  
  export function buildPickupSMS(
    postId: string,
    restaurantName: string,
    foodDescription: string,
    portions: number,
    pickupBy: string,
    shelterName: string,
    volunteerPhone?: string
  ): string {
    const claimLink = buildClaimLink(postId, volunteerPhone);
    const declineLink = buildDeclineLink(postId, volunteerPhone);

    return `🍽️ ONE MORE PLATE — Food pickup available!
  
  📍 ${restaurantName}
  🥘 ${foodDescription}
  👥 ${portions} portions
  ⏰ Pickup by ${pickupBy}
  🏠 Drop-off: ${shelterName}
  
  Accept: ${claimLink}
  Decline: ${declineLink}
  
  Reply STOP to unsubscribe.`;
  }

export function buildAcceptedRunSMS(args: {
  restaurantName: string;
  foodDescription: string;
  portions: number;
  pickupBy: string;
  shelterName: string;
  shelterAddress: string;
}): string {
  return `✅ You accepted a One More Plate pickup.

📍 Pickup: ${args.restaurantName}
🥘 ${args.foodDescription}
👥 ${args.portions} portions
⏰ Pickup by ${args.pickupBy}

🏠 Drop-off: ${args.shelterName}
${args.shelterAddress}

Open the app for live directions.`;
}
