import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw, Search, MessageSquare, AlertCircle, CheckCircle2, Phone, User, Clock } from 'lucide-react';
import { apiClient } from '../../../lib/axios';

interface SmsLog {
  id: string;
  trigger_event: string;
  phone_number: string;
  message_body: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  provider_response: string | null;
  created_at: string;
  sent_at: string | null;
  customer_name: string | null;
}

export function SMSLogsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sms-logs', page, searchTerm],
    queryFn: async () => {
      const res = await apiClient.get(`/notifications/sms-logs?page=${page}&limit=50&search=${encodeURIComponent(searchTerm)}`);
      return res.data;
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/notifications/sms-logs/${id}/retry`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <span className="badge badge-success"><CheckCircle2 size={12} style={{marginRight: 4}}/> Sent</span>;
      case 'FAILED':
        return <span className="badge badge-error"><AlertCircle size={12} style={{marginRight: 4}}/> Failed</span>;
      default:
        return <span className="badge badge-warning"><Clock size={12} style={{marginRight: 4}}/> Pending</span>;
    }
  };

  const handleRetry = (id: string) => {
    if (window.confirm("Are you sure you want to retry sending this SMS?")) {
      retryMutation.mutate(id);
    }
  };

  const logs: SmsLog[] = data?.data || [];
  const totalPages = data?.total ? Math.ceil(data.total / 50) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} style={{ color: 'var(--brand-primary)' }} /> SMS Logs
          </h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            View and manage system generated SMS notifications
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1, maxWidth: '400px', display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px 8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}
              placeholder="Search by phone number or customer name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button style={{ padding: '0 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 500, fontSize: '14px' }} onClick={() => queryClient.invalidateQueries({ queryKey: ['sms-logs'] })}>
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading logs...</div>
        ) : isError ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--status-error)' }}>Failed to load SMS logs.</div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Event</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Message</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No logs found.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                      <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{new Date(log.created_at).toLocaleDateString('en-GB')}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleTimeString()}</div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={14} color="var(--text-muted)" />
                          {log.customer_name || 'N/A'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.85rem' }}>
                          <Phone size={14} color="var(--text-muted)" />
                          {log.phone_number}
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}><span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: '4px', fontFamily: 'monospace' }}>{log.trigger_event}</span></td>
                      <td style={{ padding: '12px 20px', maxWidth: '300px' }}>
                        <div style={{ fontSize: '0.85rem', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                          {log.message_body}
                        </div>
                        {log.provider_response && log.status === 'FAILED' && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--status-error)', marginTop: '4px', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                            Error: {log.provider_response}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 20px' }}>{getStatusBadge(log.status)}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        {log.status === 'FAILED' && (
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'var(--status-error)', color: 'var(--status-error)' }}
                            onClick={() => handleRetry(log.id)}
                            disabled={retryMutation.isPending}
                          >
                            <RefreshCcw size={14} /> Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {!isLoading && !isError && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, color: 'var(--text-primary)' }}
              >
                Previous
              </button>
              <button 
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1, color: 'var(--text-primary)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
