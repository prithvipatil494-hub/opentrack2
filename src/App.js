// App.js
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Download, Map } from 'lucide-react';
import './App.css';

export default function LocationTracker() {
  const [showMap, setShowMap] = useState(false);
  const [position, setPosition] = useState(null);
  const [recording, setRecording] = useState(false);
  const [pathData, setPathData] = useState([]);
  const [trackingData, setTrackingData] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.body.appendChild(script);

    // Load XLSX JS
    const xlsxScript = document.createElement('script');
    xlsxScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    document.body.appendChild(xlsxScript);

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (showMap && mapLoaded && !mapInstanceRef.current) {
      setTimeout(() => {
        initMap();
      }, 100);
    }
  }, [showMap, mapLoaded]);

  const initMap = () => {
    if (mapInstanceRef.current || !window.L) return;

    try {
      const map = window.L.map('map').setView([20.5937, 78.9629], 5);
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      const icon = window.L.divIcon({
        html: '<div style="background: #ff8c00; width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 12px rgba(255, 140, 0, 0.8);"></div>',
        iconSize: [20, 20],
        className: ''
      });

      markerRef.current = window.L.marker([20.5937, 78.9629], { icon }).addTo(map);
      
      requestLocationPermission();
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const currentSpeed = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(2) : 0;

        setPosition({ lat, lng });
        setSpeed(currentSpeed);
        setShowInfo(true);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
          markerRef.current.setLatLng([lat, lng]);
        }

        startContinuousTracking();
      },
      (error) => {
        alert('Location permission denied or error occurred: ' + error.message);
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const startContinuousTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        const newSpeed = position.coords.speed ? (position.coords.speed * 3.6).toFixed(2) : 0;

        setPosition({ lat: newLat, lng: newLng });
        setSpeed(newSpeed);

        if (markerRef.current && mapInstanceRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
          mapInstanceRef.current.setView([newLat, newLng]);
        }

        if (recording) {
          setPathData(prev => {
            const updated = [...prev, [newLat, newLng]];

            if (polylineRef.current && mapInstanceRef.current) {
              mapInstanceRef.current.removeLayer(polylineRef.current);
            }

            if (window.L && mapInstanceRef.current) {
              polylineRef.current = window.L.polyline(updated, {
                color: '#ff8c00',
                weight: 5,
                opacity: 0.9
              }).addTo(mapInstanceRef.current);
            }

            return updated;
          });

          const timestamp = new Date().toLocaleString();
          const address = await getAddress(newLat, newLng);
          
          setTrackingData(prev => [...prev, {
            timestamp,
            latitude: newLat.toFixed(6),
            longitude: newLng.toFixed(6),
            address,
            speed: newSpeed + ' km/h'
          }]);
        }
      },
      (error) => {
        console.error('Error tracking location:', error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const getAddress = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.display_name || 'Address not available';
    } catch (err) {
      return 'Unable to fetch address';
    }
  };

  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        alert(`📍 Your Current Location:\n\nLatitude: ${lat.toFixed(6)}\nLongitude: ${lng.toFixed(6)}\nAccuracy: ${acc.toFixed(0)} meters`);
      },
      (error) => {
        alert('Unable to retrieve your location. Please allow location permission.\n\nError: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleTrackInMap = () => {
    if (!mapLoaded) {
      alert('Map is still loading. Please wait a moment and try again.');
      return;
    }
    setShowMap(true);
  };

  const handleBackToMenu = () => {
    setShowMap(false);
    setRecording(false);
    setShowInfo(false);
    
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (polylineRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    
    setPathData([]);
  };

  const toggleRecording = () => {
    if (!recording) {
      setRecording(true);
      setPathData([]);
      setTrackingData([]);
      alert('🔴 Recording started! Your path will be tracked in orange.');
    } else {
      setRecording(false);
      alert(`⏹ Recording stopped!\n\nTotal points recorded: ${pathData.length}\n\nGo back to menu and click "Export to Excel" to download your data.`);
    }
  };

  const exportToExcel = () => {
    if (trackingData.length === 0) {
      alert('❌ No tracking data available!\n\nPlease:\n1. Click "Track in Map"\n2. Click "Record Path"\n3. Move around to record your location\n4. Come back and export');
      return;
    }

    if (!window.XLSX) {
      alert('Excel library is still loading. Please wait a moment and try again.');
      return;
    }

    try {
      const ws = window.XLSX.utils.json_to_sheet(trackingData);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Location Data');
      
      const fileName = `location_tracking_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`;
      window.XLSX.writeFile(wb, fileName);
      
      alert(`✅ Excel file downloaded successfully!\n\nFile: ${fileName}\nTotal records: ${trackingData.length}`);
    } catch (error) {
      alert('Error creating Excel file: ' + error.message);
    }
  };

  if (!showMap) {
    return (
      <div className="tracker-container">
        <div className="menu-container">
          <h1 className="menu-title">📍 Location Tracker</h1>
          
          <div className="option-card" onClick={handleLiveLocation}>
            <MapPin size={48} />
            <h2>Live Location</h2>
            <p>Get your current location coordinates instantly</p>
          </div>

          <div className="option-card" onClick={exportToExcel}>
            <Download size={48} />
            <h2>Export to Excel</h2>
            <p>Download all recorded location data with speed and timestamps</p>
          </div>

          <div className="option-card" onClick={handleTrackInMap}>
            <Map size={48} />
            <h2>Track in Map</h2>
            <p>View and record your location path on an interactive map</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-view">
      <button className="back-btn" onClick={handleBackToMenu}>
        ← Back to Menu
      </button>
      
      <button 
        className={`record-btn ${recording ? 'recording' : ''}`}
        onClick={toggleRecording}
      >
        {recording ? '⏹ Stop Recording' : '🔴 Record Path'}
      </button>
      
      <div id="map"></div>
      
      {!mapInstanceRef.current && (
        <div className="loading">Loading map... Please wait</div>
      )}
      
      {showInfo && position && (
        <div className="info-box">
          <div><span className="label">Latitude:</span> {position.lat.toFixed(6)}</div>
          <div><span className="label">Longitude:</span> {position.lng.toFixed(6)}</div>
          <div><span className="label">Speed:</span> {speed} km/h</div>
          <div><span className="label">Points Recorded:</span> {pathData.length}</div>
          {recording && <div className="recording-indicator">🔴 RECORDING</div>}
        </div>
      )}
    </div>
  );
}