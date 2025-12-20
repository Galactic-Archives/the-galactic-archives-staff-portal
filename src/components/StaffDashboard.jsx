import React, { useEffect, useState } from 'react';

export default function StaffDashboard({ apiFetch }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/staff/dashboard');
      setStats(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-16">Loading dashboard...</div>;
  if (error) return <div className="alert alert--error">{error}</div>;
  if (!stats) return <div>No data</div>;

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-20)' }}>Staff Dashboard</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 'var(--space-16)',
        marginBottom: 'var(--space-32)',
      }}>
        <div className="card">
          <div className="card__body">
            <h3 style={{ color: 'var(--color-text-secondary)' }}>Open Tickets</h3>
            <div style={{
              fontSize: 'var(--font-size-4xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-error)',
              marginTop: 'var(--space-8)',
            }}>
              {stats.open_tickets}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__body">
            <h3 style={{ color: 'var(--color-text-secondary)' }}>In Progress</h3>
            <div style={{
              fontSize: 'var(--font-size-4xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-warning)',
              marginTop: 'var(--space-8)',
            }}>
              {stats.in_progress_tickets}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__body">
            <h3 style={{ color: 'var(--color-text-secondary)' }}>Closed (Today)</h3>
            <div style={{
              fontSize: 'var(--font-size-4xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-success)',
              marginTop: 'var(--space-8)',
            }}>
              {stats.closed_today}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__body">
            <h3 style={{ color: 'var(--color-text-secondary)' }}>KB Articles</h3>
            <div style={{
              fontSize: 'var(--font-size-4xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-primary)',
              marginTop: 'var(--space-8)',
            }}>
              {stats.total_articles}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2>Recent Activity</h2>
        </div>
        <div className="card__body">
          <p>Recent ticket submissions and updates from participants</p>
          <button className="btn btn--primary" style={{ marginTop: 'var(--space-16)' }}>
            View All Tickets
          </button>
        </div>
      </div>
    </div>
  );
}
