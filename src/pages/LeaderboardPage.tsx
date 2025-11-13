import React from 'react';

/**
 * LeaderboardPage - Simple leaderboard component
 * TODO: Implement full leaderboard functionality with Firebase integration
 */
export function LeaderboardPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '32px',
        marginBottom: '20px'
      }}>
        🏴‍☠️ Leaderboard
      </h1>
      <p style={{
        fontSize: '14px',
        marginBottom: '30px',
        opacity: 0.7
      }}>
        Leaderboard functionality coming soon
      </p>
      <button
        onClick={() => window.location.href = '/'}
        style={{
          padding: '15px 40px',
          fontSize: '14px',
          backgroundColor: 'transparent',
          color: 'white',
          border: '2px solid #ffffff',
          cursor: 'pointer',
          borderRadius: '4px'
        }}
      >
        ← Back to Game
      </button>
    </div>
  );
}
