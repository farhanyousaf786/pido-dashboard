import React, { useEffect, useState } from 'react';
import { Save, Settings as SettingsIcon, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { getAppSettings, saveAppSettings } from '../../core/services/appSettingsService.js';

function Settings() {
  const [values, setValues] = useState({
    autoCancelTimeInMin: '',
    distanceTravelFee: [],
    providerDistanceInMiles: '',
  });
  const [expandedTiers, setExpandedTiers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const s = await getAppSettings();
        if (!mounted) return;
        setValues({
          autoCancelTimeInMin: s.autoCancelTimeInMin ?? '',
          distanceTravelFee: s.distanceTravelFee ?? [],
          providerDistanceInMiles: s.providerDistanceInMiles ?? '',
        });
        setExpandedTiers(new Set([0]));
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load settings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleTierChange = (index, field, value) => {
    setValues((prev) => {
      const next = { ...prev };
      next.distanceTravelFee = [...prev.distanceTravelFee];
      next.distanceTravelFee[index] = {
        ...prev.distanceTravelFee[index],
        [field]: value,
      };
      return next;
    });
  };

  const handleAddTier = () => {
    setValues((prev) => ({
      ...prev,
      distanceTravelFee: [...prev.distanceTravelFee, { distanceInMiles: '', travelFee: '' }],
    }));
    const newIdx = values.distanceTravelFee.length;
    setExpandedTiers((prev) => new Set([...prev, newIdx]));
  };

  const handleRemoveTier = (index) => {
    setValues((prev) => ({
      ...prev,
      distanceTravelFee: prev.distanceTravelFee.filter((_, i) => i !== index),
    }));
    setExpandedTiers((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const toggleTier = (index) => {
    setExpandedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      setSaving(true);
      await saveAppSettings(values);
      setMessage('Settings saved.');
    } catch (e) {
      setError(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-shell admin-settings">
      <h1 className="page-shell__title">App Settings</h1>
      <p className="page-shell__subtitle">Manage global app configuration.</p>

      {(error || message) && (
        <div className={`admin-settings__banner ${error ? 'admin-settings__banner--error' : 'admin-settings__banner--ok'}`}>
          {error || message}
        </div>
      )}

      <div className="admin-settings__grid">
        <div className="admin-settings__card admin-settings__card--profile">
          <h2 className="admin-settings__card-title">
            <SettingsIcon size={18} />
            Core Settings
          </h2>

          {loading ? (
            <div className="admin-settings__hint">Loading…</div>
          ) : (
            <form className="admin-settings__form" onSubmit={handleSave}>
              <label className="admin-settings__label">
                <span>Auto cancel time (minutes)</span>
                <input
                  type="number"
                  className="admin-settings__input"
                  name="autoCancelTimeInMin"
                  value={values.autoCancelTimeInMin}
                  onChange={handleChange}
                  min={0}
                />
              </label>

              <label className="admin-settings__label">
                <span>Provider distance (miles)</span>
                <input
                  type="number"
                  className="admin-settings__input"
                  name="providerDistanceInMiles"
                  value={values.providerDistanceInMiles}
                  onChange={handleChange}
                  min={0}
                />
              </label>

              <div className="admin-settings__divider" style={{ margin: '20px 0', borderTop: '1px solid var(--border-color)' }} />

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Distance Travel Fee Tiers</h3>
                  <button
                    type="button"
                    onClick={handleAddTier}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '13px',
                      backgroundColor: 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} />
                    Add Tier
                  </button>
                </div>

                {values.distanceTravelFee.map((tier, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: '12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTier(index)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor: 'var(--surface-color)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      <span>
                        Tier {index}
                        {tier.distanceInMiles && ` • ${tier.distanceInMiles} mi`}
                      </span>
                      <ChevronDown
                        size={16}
                        style={{
                          transform: expandedTiers.has(index) ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </button>

                    {expandedTiers.has(index) && (
                      <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <label className="admin-settings__label" style={{ margin: 0 }}>
                            <span>Distance (miles)</span>
                            <input
                              type="number"
                              className="admin-settings__input"
                              value={tier.distanceInMiles}
                              onChange={(e) => handleTierChange(index, 'distanceInMiles', e.target.value)}
                              min={0}
                            />
                          </label>
                          <label className="admin-settings__label" style={{ margin: 0 }}>
                            <span>Travel fee</span>
                            <input
                              type="number"
                              className="admin-settings__input"
                              value={tier.travelFee}
                              onChange={(e) => handleTierChange(index, 'travelFee', e.target.value)}
                              min={0}
                              step="0.01"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {values.distanceTravelFee.length === 0 && (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px' }}>
                    No tiers added yet. Click "Add Tier" to create one.
                  </p>
                )}
              </div>

              <div className="admin-settings__password-actions">
                <button
                  type="submit"
                  className="admin-settings__btn admin-settings__btn--primary admin-settings__btn--inline"
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default Settings;
