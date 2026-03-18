import React, { useEffect, useState, useRef, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getMapIncidents } from '../utils/api';
import AppHeader from '../components/layout/AppHeader';
import styles from './MapPage.module.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const SEV_COLOR = {
  critical: '#B71C1C',
  high:     '#E53935',
  medium:   '#F57F17',
  low:      '#00897B',
};

const TYPE_ICON = {
  Harassment:     '😰',
  Stalking:       '👁️',
  Assault:        '🚨',
  'Unsafe Area':  '⚠️',
  'Poor Lighting':'💡',
  Theft:          '👜',
  'Eve Teasing':  '📣',
  Other:          '📝',
};

// ── Safe place config with Overpass OSM tags ─────────────────
const SAFE_TYPES = [
  {
    id:    'police',
    label: 'Police',
    icon:  '🚔',
    color: '#1565C0',
    osm:   '[amenity=police]',
    fallback: 'police station',
  },
  {
    id:    'hospital',
    label: 'Hospital',
    icon:  '🏥',
    color: '#2E7D32',
    osm:   '[amenity~"hospital|clinic|doctors"]',
    fallback: 'hospital',
  },
  {
    id:    'helpline',
    label: 'Helpline',
    icon:  '🆘',
    color: '#C2185B',
    osm:   '[amenity~"social_facility|community_centre"][name~"women|mahila|ngo",i]',
    fallback: 'women helpline',
  },
  {
    id:    'shop',
    label: '24hr Shop',
    icon:  '🏪',
    color: '#E65100',
    osm:   '[shop~"convenience|supermarket"][opening_hours~"24"]',
    fallback: 'convenience store',
  },
];

// ── Fetch from Overpass API (real OSM data) ───────────────────
const fetchOverpass = async (osmTag, lat, lng, radius = 5000) => {
  const query = `
    [out:json][timeout:10];
    (
      node${osmTag}(around:${radius},${lat},${lng});
      way${osmTag}(around:${radius},${lat},${lng});
    );
    out center 10;
  `;
  const res  = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body:   'data=' + encodeURIComponent(query),
  });
  const data = await res.json();
  return (data.elements || []).map((el) => ({
    id:        `osm-${el.id}`,
    name:      el.tags?.name || el.tags?.['name:en'] || 'Unnamed',
    address:   [el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', ') || 'See on map',
    phone:     el.tags?.phone || el.tags?.['contact:phone'] || null,
    longitude: el.lon ?? el.center?.lon,
    latitude:  el.lat ?? el.center?.lat,
    opening:   el.tags?.opening_hours || null,
  })).filter(p => p.longitude && p.latitude);
};

// ── Fallback: Mapbox Geocoding ────────────────────────────────
const fetchMapbox = async (query, lat, lng, token) => {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?proximity=${lng},${lat}&limit=8&access_token=${token}`;
  const res  = await fetch(url);
  const data = await res.json();
  return (data.features || []).map((f) => ({
    id:        f.id,
    name:      f.text,
    address:   f.place_name,
    phone:     null,
    longitude: f.center[0],
    latitude:  f.center[1],
    opening:   null,
  }));
};

const MapPage = () => {
  const navigate      = useNavigate();
  const geoControlRef = useRef(null);

  const [incidents,      setIncidents]      = useState([]);
  const [safePlaces,     setSafePlaces]     = useState([]);
  const [selected,       setSelected]       = useState(null);
  const [userCoords,     setUserCoords]     = useState(null);
  const [viewport,       setViewport]       = useState({ longitude: 72.8777, latitude: 19.0760, zoom: 13 });
  const [filterSev,      setFilterSev]      = useState('all');
  const [activeSafeType, setActiveSafeType] = useState(null);
  const [loadingSafe,    setLoadingSafe]    = useState(false);
  const [mapMode,        setMapMode]        = useState('incidents'); // incidents | safe

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ latitude, longitude });
        setViewport((v) => ({ ...v, latitude, longitude, zoom: 14 }));
        fetchIncidents(longitude, latitude);
      },
      () => fetchIncidents(),
      { enableHighAccuracy: true, timeout: 8000 }
    );
    // eslint-disable-next-line
  }, []);

  const fetchIncidents = useCallback(async (lng, lat) => {
    try {
      const params = { radius: 30 };
      if (lng && lat) { params.longitude = lng; params.latitude = lat; }
      const { data } = await getMapIncidents(params);
      setIncidents(data.incidents);
    } catch {
      toast.error('Failed to load map data');
    }
  }, []);

  const fetchSafePlaces = useCallback(async (type) => {
    if (!userCoords) {
      toast.error('Enable location to find nearby places');
      return;
    }
    setLoadingSafe(true);
    setSafePlaces([]);

    const { latitude, longitude } = userCoords;

    try {
      // Try Overpass (real OSM data) first
      let places = await fetchOverpass(type.osm, latitude, longitude);

      // Fallback to Mapbox if OSM gives nothing
      if (places.length === 0 && MAPBOX_TOKEN) {
        places = await fetchMapbox(type.fallback, latitude, longitude, MAPBOX_TOKEN);
      }

      // Tag each place with its type
      places = places.map(p => ({ ...p, safeType: type }));
      setSafePlaces(places);

      if (places.length === 0) {
        toast.info(`No ${type.label} found within 5km`);
      } else {
        toast.success(`Found ${places.length} ${type.label} nearby 📍`);
      }
    } catch {
      // If Overpass fails try Mapbox directly
      try {
        if (MAPBOX_TOKEN) {
          const places = (await fetchMapbox(type.fallback, latitude, longitude, MAPBOX_TOKEN))
            .map(p => ({ ...p, safeType: type }));
          setSafePlaces(places);
          toast.success(`Found ${places.length} ${type.label} nearby 📍`);
        }
      } catch {
        toast.error('Failed to find safe places');
      }
    } finally {
      setLoadingSafe(false);
    }
  }, [userCoords]);

  const handleSafeTypeClick = (type) => {
    if (activeSafeType?.id === type.id) {
      setActiveSafeType(null);
      setSafePlaces([]);
      return;
    }
    setActiveSafeType(type);
    setMapMode('safe');
    fetchSafePlaces(type);
  };

  const filtered = filterSev === 'all'
    ? incidents
    : incidents.filter((i) => i.severity === filterSev);

  const distanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
  };

  return (
    <div className={styles.page}>
      <AppHeader title="Safety Map" showBack />

      {/* ── Mode toggle: Incidents vs Safe Places ── */}
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeBtn} ${mapMode === 'incidents' ? styles.modeBtnActive : ''}`}
          onClick={() => { setMapMode('incidents'); setActiveSafeType(null); setSafePlaces([]); }}
        >
          ⚠️ Incidents ({filtered.length})
        </button>
        <button
          className={`${styles.modeBtn} ${mapMode === 'safe' ? styles.modeBtnActiveSafe : ''}`}
          onClick={() => setMapMode('safe')}
        >
          🛡️ Safe Places
        </button>
      </div>

      {/* ── Incident severity filters ── */}
      {mapMode === 'incidents' && (
        <div className={styles.filterBar}>
          {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
            <button
              key={s}
              className={`${styles.chip} ${filterSev === s ? styles.chipActive : ''}`}
              style={filterSev === s && s !== 'all' ? { background: SEV_COLOR[s], borderColor: SEV_COLOR[s], color: '#fff' } : {}}
              onClick={() => setFilterSev(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* ── Safe place type chips ── */}
      {mapMode === 'safe' && (
        <div className={styles.safePlacesBar}>
          {SAFE_TYPES.map((type) => (
            <button
              key={type.id}
              className={`${styles.safeChip} ${activeSafeType?.id === type.id ? styles.safeChipActive : ''}`}
              style={activeSafeType?.id === type.id
                ? { background: type.color, borderColor: type.color, color: '#fff' }
                : {}}
              onClick={() => handleSafeTypeClick(type)}
            >
              <span>{loadingSafe && activeSafeType?.id === type.id ? '⏳' : type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Map ── */}
      <div className={styles.mapWrap}>
        {!MAPBOX_TOKEN ? (
          <div className={styles.noToken}>
            <span>🗺️</span>
            <p>Mapbox token not configured</p>
            <small>Add REACT_APP_MAPBOX_TOKEN to .env</small>
          </div>
        ) : (
          <Map
            {...viewport}
            onMove={(evt) => setViewport(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            style={{ width: '100%', height: '100%' }}
            onClick={() => setSelected(null)}
          >
            <NavigationControl position="bottom-right" showCompass={false} />
            <GeolocateControl
              ref={geoControlRef}
              position="bottom-right"
              trackUserLocation
              showAccuracyCircle={false}
            />

            {/* Incident markers */}
            {mapMode === 'incidents' && filtered.map((inc) => {
              const [lng, lat] = inc.location.coordinates;
              const color = SEV_COLOR[inc.severity] || '#F57F17';
              return (
                <Marker key={inc._id} longitude={lng} latitude={lat} anchor="bottom"
                  onClick={(e) => { e.originalEvent.stopPropagation(); setSelected({ ...inc, _kind: 'incident' }); }}
                >
                  <div className={styles.pin} style={{ background: color, boxShadow: `0 2px 8px ${color}66` }}>
                    <span className={styles.pinIcon}>{TYPE_ICON[inc.type] || '⚠️'}</span>
                  </div>
                </Marker>
              );
            })}

            {/* Safe place markers */}
            {mapMode === 'safe' && safePlaces.map((place) => (
              <Marker key={place.id} longitude={place.longitude} latitude={place.latitude} anchor="bottom"
                onClick={(e) => { e.originalEvent.stopPropagation(); setSelected({ ...place, _kind: 'safe' }); }}
              >
                <div className={styles.safePin}
                  style={{ background: place.safeType.color, boxShadow: `0 4px 14px ${place.safeType.color}99` }}>
                  <span className={styles.safePinIcon}>{place.safeType.icon}</span>
                </div>
              </Marker>
            ))}

            {/* Incident popup */}
            {selected?._kind === 'incident' && (
              <Popup
                longitude={selected.location.coordinates[0]}
                latitude={selected.location.coordinates[1]}
                anchor="top" onClose={() => setSelected(null)} closeButton
                className={styles.popup}
              >
                <div className={styles.popupContent}>
                  <div className={styles.popupHeader}>
                    <span className={styles.popupEmoji}>{TYPE_ICON[selected.type] || '⚠️'}</span>
                    <div>
                      <strong className={styles.popupTitle}>{selected.type}</strong>
                      <span className={styles.popupSev}
                        style={{ background: SEV_COLOR[selected.severity] + '22', color: SEV_COLOR[selected.severity] }}>
                        {selected.severity}
                      </span>
                    </div>
                  </div>
                  <p className={styles.popupAddr}>📍 {selected.location?.address || 'Unknown location'}</p>
                  <p className={styles.popupMeta}>Status: <strong>{selected.status}</strong></p>
                </div>
              </Popup>
            )}

            {/* Safe place popup */}
            {selected?._kind === 'safe' && (
              <Popup
                longitude={selected.longitude}
                latitude={selected.latitude}
                anchor="top" onClose={() => setSelected(null)} closeButton
                className={styles.popup}
              >
                <div className={styles.popupContent}>
                  <div className={styles.popupHeader}>
                    <span className={styles.popupEmoji}>{selected.safeType.icon}</span>
                    <div>
                      <strong className={styles.popupTitle}>{selected.name}</strong>
                      <span className={styles.popupTypeBadge}
                        style={{ background: selected.safeType.color + '22', color: selected.safeType.color }}>
                        {selected.safeType.label}
                      </span>
                    </div>
                  </div>
                  <p className={styles.popupAddr}>📍 {selected.address}</p>
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} className={styles.callBtn}>
                      📞 {selected.phone}
                    </a>
                  )}
                  {selected.opening && (
                    <p className={styles.popupMeta}>🕐 {selected.opening}</p>
                  )}
                  {userCoords && (
                    <p className={styles.popupMeta}>
                      📏 {distanceKm(userCoords.latitude, userCoords.longitude, selected.latitude, selected.longitude)} km away
                    </p>
                  )}
                  <a
                    href={`https://maps.google.com/?q=${selected.latitude},${selected.longitude}`}
                    target="_blank" rel="noreferrer"
                    className={styles.directionsBtn}
                    style={{ background: selected.safeType.color }}
                  >
                    🧭 Get Directions
                  </a>
                </div>
              </Popup>
            )}
          </Map>
        )}
      </div>

      {/* Safe places list panel */}
      {mapMode === 'safe' && safePlaces.length > 0 && (
        <div className={styles.safeList}>
          <p className={styles.safeListTitle}>
            {activeSafeType?.icon} {safePlaces.length} {activeSafeType?.label} nearby
          </p>
          <div className={styles.safeListScroll}>
            {safePlaces.map((place) => (
              <div
                key={place.id}
                className={styles.safeListItem}
                style={{ borderLeftColor: place.safeType.color }}
                onClick={() => {
                  setSelected({ ...place, _kind: 'safe' });
                  setViewport(v => ({ ...v, latitude: place.latitude, longitude: place.longitude, zoom: 16 }));
                }}
              >
                <span className={styles.safeListIcon}>{place.safeType.icon}</span>
                <div className={styles.safeListInfo}>
                  <strong>{place.name}</strong>
                  <span>{place.address}</span>
                  {place.phone && <span className={styles.safeListPhone}>📞 {place.phone}</span>}
                </div>
                {userCoords && (
                  <span className={styles.safeListDist}>
                    {distanceKm(userCoords.latitude, userCoords.longitude, place.latitude, place.longitude)}km
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incident legend */}
      {mapMode === 'incidents' && (
        <div className={styles.legend}>
          {Object.entries(SEV_COLOR).map(([sev, color]) => (
            <div key={sev} className={styles.legendItem}>
              <div className={styles.legendDot} style={{ background: color }} />
              <span>{sev.charAt(0).toUpperCase() + sev.slice(1)}</span>
            </div>
          ))}
        </div>
      )}

      <button className={styles.fab} onClick={() => navigate('/report')}>
        + Report
      </button>
    </div>
  );
};

export default MapPage;