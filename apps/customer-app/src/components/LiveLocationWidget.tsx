import React, { useState } from 'react';
import { Navigation, MapPin, Compass, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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

  const handleDetectGPS = async () => {
    try {
      setIsDetecting(true);
      setLocationError(null);
      setDetectionSuccess(false);

      // 1. Get Live GPS Coordinates from Device Hardware
      const coords = await getCurrentDeviceLocation();

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
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-indigo-100 shadow-lg shadow-indigo-500/5 relative overflow-hidden transition-colors">
      {/* Background Decorative Gradient */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full pointer-events-none blur-2xl" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        {/* Left: Location Details & Live Indicator */}
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/30 relative">
            <Navigation className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-ping" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isHindi ? 'लाइव जीपीएस सक्रिय' : 'Live GPS Active'}</span>
              </span>

              {selectedAddress?.latitude && selectedAddress?.longitude && (
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                  {Number(selectedAddress.latitude).toFixed(4)}°N, {Number(selectedAddress.longitude).toFixed(4)}°E
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-1">
              <span>
                {selectedAddress?.addressLine || (isHindi ? 'वर्तमान स्थान का पता लगाएं' : 'Detecting your live service location')}
              </span>
            </h3>

            <p className="text-xs text-gray-500 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
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
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center space-x-2 shadow-md transition-all active:scale-95 cursor-pointer ${
              detectionSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
            }`}
          >
            {isDetecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isHindi ? 'स्थान खोज रहे हैं...' : 'Detecting Live GPS...'}</span>
              </>
            ) : detectionSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isHindi ? 'स्थान मिल गया!' : 'GPS Location Updated!'}</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4 text-yellow-300" />
                <span>{isHindi ? 'लाइव लोकेशन पता करें' : 'Detect My Location'}</span>
              </>
            )}
          </button>

          {onOpenModal && (
            <button
              type="button"
              onClick={onOpenModal}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              {isHindi ? 'पता बदलें' : 'Change'}
            </button>
          )}
        </div>
      </div>

      {locationError && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3.5 py-2 rounded-2xl text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{locationError}</span>
        </div>
      )}
    </div>
  );
};
