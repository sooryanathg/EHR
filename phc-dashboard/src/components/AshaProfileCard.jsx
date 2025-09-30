"use client";

import React from 'react';

export default function AshaProfileCard({ profile, counts }) {
  const displayName = profile?.name || profile?.displayName || profile?.email || profile?.id;

  return (
    <div className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-semibold text-blue-700">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-lg font-semibold text-gray-900">{displayName}</div>
          <div className="text-sm text-gray-500">{profile?.village || profile?.location || '—'}</div>
          {profile?.phone && <div className="text-sm text-gray-500 mt-1">{profile.phone}</div>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-md p-3 text-center">
          <div className="text-sm text-gray-500">Patients</div>
          <div className="text-lg font-bold text-gray-900">{counts?.patients ?? '-'}</div>
        </div>
        <div className="bg-gray-50 rounded-md p-3 text-center">
          <div className="text-sm text-gray-500">Visits</div>
          <div className="text-lg font-bold text-gray-900">{counts?.visits ?? '-'}</div>
        </div>
        <div className="bg-gray-50 rounded-md p-3 text-center">
          <div className="text-sm text-gray-500">Vaccinations</div>
          <div className="text-lg font-bold text-gray-900">{counts?.vaccinations ?? '-'}</div>
        </div>
      </div>
    </div>
  );
}
