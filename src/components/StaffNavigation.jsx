import React from 'react';

export default function StaffNavigation({ currentPage, onPageChange, user, onLogout }) {
  return (
    <nav style={{
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      padding: 'var(--space-16)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-24)' }}>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', margin: 0, color: 'var(--color-primary)' }}>
          GA Staff Portal
        </h2>

        <div style={{ display: 'flex', gap: 'var(--space-16)' }}>
          <button
            className={`btn ${currentPage === 'dashboard' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => onPageChange('dashboard')}
            style={{ fontSize: 'var(--font-size-sm)' }}
          >
            Dashboard
          </button>
          <button
            className={`btn ${currentPage === 'tickets' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => onPageChange('tickets')}
            style={{ fontSize: 'var(--font-size-sm)' }}
          >
            Tickets
          </button>
          <button
            className={`btn ${currentPage === 'kb' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => onPageChange('kb')}
            style={{ fontSize: 'var(--font-size-sm)' }}
          >
            KB Editor
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)' }}>
        <small style={{ color: 'var(--color-text-secondary)' }}>
          {user?.email} (Staff)
        </small>
        <button
          className="btn btn--outline btn--sm"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
