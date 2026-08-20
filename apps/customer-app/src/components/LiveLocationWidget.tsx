import React, { useState } from 'react';
import { Navigation, MapPin, Compass, CheckCircle2, AlertCircle, Loader2, Target, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentDeviceLocation, reverseGeocodeCoordinates } from '../services/location';

interface LiveLocationWidgetProps {
  onOpenModal?: () => void;
}

export const LiveLocationWidget: React.FC<LiveLocationWidgetProps> = ({ onOpenModal }) => {
  const { selectedAddress, setSelectedAddress } = useAuth();
  const { language } = useLanguage();
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [detectionSuccess, setDetectionSuccess] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const handleDetectGPS = async () => {
    try {
      setIsDetecting(true);
      setLocationError(null);
      setDetectionSuccess(false);

      // 1. Get Live GPS Coordinates from Device Hardware with High Accuracy
      const coords = await getCurrentDeviceLocation();
      if (coords.accuracy) {
        setGpsAccuracy(coords.accuracy);
      }

      // 2. Reverse Geocode Coordinates to human address
      const geoResult = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);

      // 3. Update active address in AuthContext & localStorage
      const detectedAddress = {
        id: 'gps-live-' + Date.now(),
        label: 'Current Live GPS Location',
        addressLine: geoResult.addressLine,
        city: geoResult.city,
        state: geoResult.state,
        pincode: geoResult.pincode,
        latitude: coords.latitude,
        longitude: coords.longitude,
        isDefault: true
      };

      setSelectedAddress(detectedAddress);
      setDetectionSuccess(true);
      setTimeout(() => setDetectionSuccess(false), 4000);
    } catch (err: any) {
      console.error('Location detection error:', err);
      setLocationError(err.message || 'Unable to detect location. Please check browser GPS permissions.');
    } finally {
      setIsDetecting(false);
    }
  };

  const isHindi = language === 'hi';

  return (
    <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-cyan-500/30 shadow-2xl relative overflow-hidden transition-all text-white">
      {/* Background Decorative Radar Grid & Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-cyan-500/15 via-emerald-500/10 to-transparent rounded-full pointer-events-none blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full pointer-events-none blur-2xl" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        {/* Left: Location Details & Device Locator Indicator */}
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20 relative">
            <Navigation className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-cyan-400 rounded-full border-2 border-slate-900 animate-ping" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-cyan-400 rounded-full border-2 border-slate-900 shadow-[0_0_8px_#00f2fe]" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#00f2fe]" />
                <span>{isHindi ? 'डिवाइस लोकेटर सक्रिय' : 'Device Locator AI Active'}</span>
              </span>

              {selectedAddress?.latitude && selectedAddress?.longitude && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-400" />
                  <span>±{gpsAccuracy ? gpsAccuracy.toFixed(1) : '2.5'}m</span>
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white flex items-center space-x-1">
              <span>
                {selectedAddress?.addressLine || (isHindi ? 'वर्तमान स्थान का पता लगाएं' : 'Detecting your live service location')}
              </span>
            </h3>

            <p className="text-xs text-slate-400 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>
                {selectedAddress
                  ? `${selectedAddress.city}, ${selectedAddress.state || 'Uttar Pradesh'} ${selectedAddress.pincode || '273001'}`
                  : (isHindi ? 'सटीक तकनीशियन मिलान के लिए जीपीएस अनुमति दें' : 'Allow GPS to find verified technicians nearest to you')}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center space-x-2 pt-2 md:pt-0">
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isDetecting}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center space-x-2 shadow-xl transition-all active:scale-95 cursor-pointer ${
              detectionSuccess
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/30'
            }`}
          >
            {isDetecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isHindi ? 'स्थान खोज रहे हैं...' : 'Acquiring GPS Lock...'}</span>
              </>
            ) : detectionSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isHindi ? 'सटीक जीपीएस सक्रिय!' : 'GPS Lock Updated!'}</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4 text-slate-950" />
                <span>{isHindi ? 'लाइव लोकेशन पता करें' : 'Acquire Live GPS'}</span>
              </>
            )}
          </button>

          {onOpenModal && (
            <button
              type="button"
              onClick={onOpenModal}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              {isHindi ? 'पता बदलें' : 'Change'}
            </button>
          )}
        </div>
      </div>

      {locationError && (
        <div className="mt-3 bg-red-950/80 border border-red-500/40 text-red-300 px-3.5 py-2 rounded-2xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{locationError}</span>
        </div>
      )}
    </div>
  );
};
