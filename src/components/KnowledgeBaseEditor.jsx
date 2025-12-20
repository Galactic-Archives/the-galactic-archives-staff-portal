import React, { useEffect, useState } from 'react';

export default function KnowledgeBaseEditor({ apiFetch }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: '', content: '' });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/staff/kb/articles');
      setArticles(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingArticle) {
        // Update existing article
        await apiFetch(`/staff/kb/articles/${editingArticle.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setSuccess('Article updated successfully!');
      } else {
        // Create new article
        await apiFetch('/staff/kb/articles', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setSuccess('Article created successfully!');
      }

      setFormData({ title: '', category: '', content: '' });
      setEditingArticle(null);
      loadArticles();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const publishArticle = async (articleId) => {
    try {
      await apiFetch(`/staff/kb/articles/${articleId}/publish`, {
        method: 'POST',
      });
      setSuccess('Article published!');
      loadArticles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteArticle = async (articleId) => {
    if (window.confirm('Are you sure you want to delete this article?')) {
      try {
        await apiFetch(`/staff/kb/articles/${articleId}`, {
          method: 'DELETE',
        });
        setSuccess('Article deleted!');
        loadArticles();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const editArticle = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      category: article.category,
      content: article.content,
    });
    window.scrollTo(0, 0);
  };

  if (loading) return <div className="p-16">Loading articles...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-20)' }}>Knowledge Base Management</h1>

      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--space-16)' }}>{error}</div>}
      {success && <div className="alert alert--success" style={{ marginBottom: 'var(--space-16)' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 'var(--space-16)' }}>
        {/* Editor */}
        <form onSubmit={handleSubmit} className="card">
          <div className="card__header">
            <h2>{editingArticle ? 'Edit Article' : 'Create New Article'}</h2>
          </div>

          <div className="card__body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-control"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Article title"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <input
                type="text"
                className="form-control"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Setup, Troubleshooting, General"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Content *</label>
              <textarea
                className="form-control"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Article content..."
                rows="12"
                required
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <button type="submit" className="btn btn--primary">
                {editingArticle ? 'Update Article' : 'Create Article'}
              </button>
              {editingArticle && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setEditingArticle(null);
                    setFormData({ title: '', category: '', content: '' });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Articles List */}
        <div>
          <h3 style={{ marginBottom: 'var(--space-16)' }}>Articles ({articles.length})</h3>
          <div style={{ display: 'grid', gap: 'var(--space-12)', maxHeight: '800px', overflowY: 'auto' }}>
            {articles.map(article => (
              <div key={article.id} className="card" style={{ padding: 'var(--space-12)' }}>
                <h4 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
                  {article.title}
                </h4>
                <small style={{ display: 'block', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)' }}>
                  {article.category}
                </small>

                <span
                  className={`status ${article.is_published ? 'status--success' : 'status--warning'}`}
                  style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-8)', display: 'inline-block' }}
                >
                  {article.is_published ? 'Published' : 'Draft'}
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => editArticle(article)}
                    style={{ fontSize: 'var(--font-size-xs)' }}
                  >
                    Edit
                  </button>

                  {!article.is_published && (
                    <button
                      className="btn btn--success btn--sm"
                      onClick={() => publishArticle(article.id)}
                      style={{ fontSize: 'var(--font-size-xs)' }}
                    >
                      Publish
                    </button>
                  )}

                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => deleteArticle(article.id)}
                    style={{ fontSize: 'var(--font-size-xs)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
