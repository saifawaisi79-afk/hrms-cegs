'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { CegsMeetRoom } from '@/components/meet/CegsMeetRoom';

export default function MeetingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useApp();
  const meetingId = params?.id;

  if (!meetingId) {
    return (
      <div style={{
        background: '#0B0F19',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        Invalid Meeting ID
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <CegsMeetRoom
        meetingId={meetingId}
        user={user}
        onLeave={() => router.push('/campaign/meetings')}
      />
    </div>
  );
}

