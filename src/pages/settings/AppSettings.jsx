import React, { useEffect, useState } from 'react';
import { Save, AlertCircle, Settings } from 'lucide-react';
import { getAppSettings, saveAppSettings } from '../../core/services/appSettingsService.js';

export default function AppSettings() {
  const [values, setValues] = useState({
    autoCancelTimeInMin: '',
    distanceInMiles: '',
    travelFee: '',
  });
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
          distanceInMiles: s.distance?.distanceInMiles ?? '',
          travelFee: s.distance?.travelFee ?? '',
        });
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
            <Settings size={18} />
            Core
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

              <div className="admin-settings__field-row">
                <label className="admin-settings__label admin-settings__label--grow">
                  <span>Max distance (miles)</span>
                  <input
                    type="number"
                    className="admin-settings__input"
                    name="distanceInMiles"
                    value={values.distanceInMiles}
                    onChange={handleChange}
                    min={0}
                  />
                </label>
                <label className="admin-settings__label admin-settings__label--grow">
                  <span>Travel fee</span>
                  <input
                    type="number"
                    className="admin-settings__input"
                    name="travelFee"
                    value={values.travelFee}
                    onChange={handleChange}
                    min={0}
                    step="0.01"
                  />
                </label>
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
