import { useEffect, useRef } from 'react';
import { usePosts, claimPostInDb } from '../lib/db';
import { useApp } from '../lib/store';
import { Eyebrow, Chip } from './UI';
import type { FoodPost } from '../types';
import { getNearestShelter, resolveRestaurantDetails } from '../lib/geo';
import { SHELTERS } from '../data/seed';
import { buildAcceptedRunSMS, sendSMS } from '../lib/sms';

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function FeedCard({ post }: { post: FoodPost }) {
  const { user, showToast, claimPost } = useApp();

  const handleClaim = async () => {
    const details = await resolveRestaurantDetails(post.restaurantName, post.restaurantAddress);
    const postWithLocation = {
      ...post,
      restaurantLocation: details.location ?? post.restaurantLocation,
      restaurantAddress: details.formattedAddress || post.restaurantAddress,
    };
    await claimPostInDb(post.id, user.firstName);
    claimPost(postWithLocation, user.firstName);
    showToast('Run claimed! Opening delivery tracker…');
  };

  return (
    <div className={`feed-card ${post.claimed ? 'claimed' : ''}`}>
      <div className="feed-top">
        <div className="feed-name">{post.restaurantName}</div>
        <div className="feed-ago">{timeAgo(post.postedAt)}</div>
      </div>
      <div className="feed-food">{post.foodDescription}</div>
      <div className="feed-chips">
        <Chip>{post.portions} portions</Chip>
        <Chip variant={post.condition === 'hot' ? 'hot' : 'default'}>
          {post.condition === 'hot' ? '🔥 Hot' : post.condition === 'warm' ? '♨️ Warm' : '❄️ Cold'}
        </Chip>
        <Chip variant="urgent">⏰ By {post.pickupBy}</Chip>
      </div>
      {post.geminiSummary && (
        <div style={{ fontSize: 12, color: 'var(--warm-grey)', marginBottom: 10, fontStyle: 'italic', lineHeight: 1.4 }}>
          🌱 {post.geminiSummary.distributionRecommendation}
        </div>
      )}
      <button
        className={`claim-btn ${post.claimed ? 'taken' : ''}`}
        onClick={!post.claimed ? handleClaim : undefined}
      >
        {post.claimed
          ? `✓ Claimed${post.claimedBy ? ` by ${post.claimedBy}` : ''}`
          : '🚗 Claim this pickup →'}
      </button>
    </div>
  );
}

export default function FeedTab() {
  const { posts, loading, newPostPing } = usePosts();
  const { claimPost, showToast } = useApp();
  const autoHandled = useRef(false);
  const pingedPostIds = useRef<Set<string>>(new Set());
  const dismissedPostIds = useRef<Set<string>>(new Set());
  const available = posts.filter(p => !p.claimed).length;

  const quickPingPost = newPostPing && !newPostPing.claimed && !dismissedPostIds.current.has(newPostPing.id)
    ? posts.find(p => p.id === newPostPing.id && !p.claimed) ?? newPostPing
    : null;

  const handleQuickAccept = async (post: FoodPost) => {
    const details = await resolveRestaurantDetails(post.restaurantName, post.restaurantAddress);
    const postWithLocation = {
      ...post,
      restaurantLocation: details.location ?? post.restaurantLocation,
      restaurantAddress: details.formattedAddress || post.restaurantAddress,
    };
    await claimPostInDb(post.id, 'In-app volunteer');
    claimPost(postWithLocation, 'In-app volunteer');
    showToast('Run accepted. Opening delivery tracker…');
  };

  const handleQuickDecline = (postId: string) => {
    dismissedPostIds.current.add(postId);
    showToast('Pickup declined. Waiting for the next ping.');
  };

  useEffect(() => {
    if (autoHandled.current || loading || posts.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const claimId = params.get('claim');
    const declineId = params.get('decline');
    const phone = params.get('phone')?.replace(/\D/g, '');
    if (!claimId && !declineId) return;

    autoHandled.current = true;

    void (async () => {
      if (declineId) {
        showToast('Pickup declined. We notified other volunteers.');
        if (phone) {
          await sendSMS(phone, '👌 You declined this pickup. Thanks for the quick response.');
        }
      } else if (claimId) {
        const targetPost = posts.find(p => p.id === claimId && !p.claimed);
        if (!targetPost) return;

        const claimedBy = 'SMS Volunteer';
        const claimed = await claimPostInDb(targetPost.id, claimedBy);
        if (!claimed) return;

        const details = await resolveRestaurantDetails(targetPost.restaurantName, targetPost.restaurantAddress);
        const postWithLocation = {
          ...targetPost,
          restaurantLocation: details.location ?? targetPost.restaurantLocation,
          restaurantAddress: details.formattedAddress || targetPost.restaurantAddress,
        };

        claimPost(postWithLocation, claimedBy);
        showToast('Run claimed from SMS link! Opening delivery tracker…');

        if (phone) {
          const shelter = getNearestShelter(postWithLocation.restaurantLocation, SHELTERS);
          await sendSMS(
            phone,
            buildAcceptedRunSMS({
              restaurantName: postWithLocation.restaurantName,
              foodDescription: postWithLocation.foodDescription,
              portions: postWithLocation.portions,
              pickupBy: postWithLocation.pickupBy,
              shelterName: shelter.name,
              shelterAddress: shelter.address,
            })
          );
        }
      }

      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, '', cleanUrl);
    })();
  }, [loading, posts, claimPost, showToast]);

  useEffect(() => {
    if (!newPostPing || newPostPing.claimed) return;
    if (pingedPostIds.current.has(newPostPing.id)) return;

    pingedPostIds.current.add(newPostPing.id);
    showToast(`🔔 New pickup: ${newPostPing.restaurantName} · ${newPostPing.portions} portions`);
  }, [newPostPing, showToast]);

  if (loading) {
    return (
      <div className="body">
        <div className="processing">
          <div className="plate-spin" style={{ fontSize: 32 }}>🍽️</div>
          <div className="proc-sub">Loading live feed…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="body">
      <Eyebrow>Open pickups near Newark, DE · {available} available</Eyebrow>
      {quickPingPost && (
        <div className="feed-card" style={{ borderColor: 'var(--terracotta)', boxShadow: '0 4px 16px rgba(196,82,42,0.12)' }}>
          <div className="feed-top">
            <div className="feed-name">🔔 New pickup ping</div>
            <div className="feed-ago">just now</div>
          </div>
          <div className="feed-food">
            {quickPingPost.restaurantName} · {quickPingPost.foodDescription}
          </div>
          <div className="feed-chips">
            <Chip>{quickPingPost.portions} portions</Chip>
            <Chip variant="urgent">⏰ By {quickPingPost.pickupBy}</Chip>
          </div>
          <button className="claim-btn" onClick={() => void handleQuickAccept(quickPingPost)}>
            ✅ Accept pickup →
          </button>
          <button
            className="claim-btn"
            style={{ marginTop: 8, borderColor: 'var(--warm-grey)', color: 'var(--warm-grey)' }}
            onClick={() => handleQuickDecline(quickPingPost.id)}
          >
            ✖ Decline
          </button>
        </div>
      )}
      {posts.length === 0 ? (
        <div className="empty">
          No pickups right now.<br />Be the first to post surplus food.
        </div>
      ) : (
        posts.map(post => <FeedCard key={post.id} post={post} />)
      )}
    </div>
  );
}
