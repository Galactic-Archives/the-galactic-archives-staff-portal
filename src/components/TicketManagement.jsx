import React, { useEffect, useState } from 'react';

export default function TicketManagement({ apiFetch }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadTickets();
  }, [filterStatus]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const endpoint = filterStatus === 'all'
        ? '/staff/tickets'
        : `/staff/tickets?status=${filterStatus}`;
      const response = await apiFetch(endpoint);
      setTickets(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      await apiFetch(`/staff/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      loadTickets();
    } catch (err) {
      setError(err.message);
    }
  };

  const addNote = async (ticketId, message) => {
    try {
      await apiFetch(`/staff/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: message }),
      });
      loadTickets();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-16">Loading tickets...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-20)' }}>Ticket Management</h1>

      <div style={{ marginBottom: 'var(--space-16)', display: 'flex', gap: 'var(--space-8)' }}>
        {['all', 'open', 'in_progress', 'closed'].map(status => (
          <button
            key={status}
            className={`btn ${filterStatus === status ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setFilterStatus(status)}
          >
            {status.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--space-16)' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 'var(--space-16)' }}>
        {/* Tickets List */}
        <div>
          {tickets.length === 0 ? (
            <div className="alert alert--info">No tickets found</div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-16)' }}>
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="card"
                  onClick={() => setSelectedTicket(ticket)}
                  style={{
                    cursor: 'pointer',
                    borderLeft: selectedTicket?.id === ticket.id ? '4px solid var(--color-primary)' : 'none',
                  }}
                >
                  <div className="card__body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-12)' }}>
                      <div>
                        <h3>#{ticket.id} - {ticket.title}</h3>
                        <small style={{ color: 'var(--color-text-secondary)' }}>
                          From: {ticket.user_email}
                        </small>
                      </div>
                      <select
                        className="form-control"
                        value={ticket.status}
                        onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '150px', fontSize: 'var(--font-size-sm)' }}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <p>{ticket.description}</p>
                    <span className={`status status--${ticket.priority === 'high' ? 'error' : ticket.priority === 'medium' ? 'warning' : 'info'}`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ticket Details Sidebar */}
        {selectedTicket && (
          <div className="card" style={{ height: 'fit-content', position: 'sticky', top: '100px' }}>
            <div className="card__header">
              <h3>Ticket #{selectedTicket.id}</h3>
            </div>
            <div className="card__body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <div style={{ marginBottom: 'var(--space-16)' }}>
                <strong>User:</strong>
                <p>{selectedTicket.user_email}</p>
              </div>

              <div style={{ marginBottom: 'var(--space-16)' }}>
                <strong>Status:</strong>
                <select
                  className="form-control"
                  value={selectedTicket.status}
                  onChange={(e) => {
                    updateTicketStatus(selectedTicket.id, e.target.value);
                    setSelectedTicket({ ...selectedTicket, status: e.target.value });
                  }}
                  style={{ marginTop: 'var(--space-8)' }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div style={{ marginBottom: 'var(--space-16)' }}>
                <strong>Messages:</strong>
                <div style={{ marginTop: 'var(--space-8)', fontSize: 'var(--font-size-sm)' }}>
                  {selectedTicket.messages?.map((msg, idx) => (
                    <div key={idx} style={{ padding: 'var(--space-8)', backgroundColor: 'var(--color-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-8)' }}>
                      <strong>{msg.author}</strong>
                      <p style={{ margin: 'var(--space-4) 0' }}>{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const message = e.target.message.value;
                  addNote(selectedTicket.id, message);
                  e.target.reset();
                }}
              >
                <input
                  type="text"
                  name="message"
                  className="form-control"
                  placeholder="Add a note..."
                  style={{ marginBottom: 'var(--space-8)' }}
                  required
                />
                <button type="submit" className="btn btn--primary btn--sm btn--full-width">
                  Add Note
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
