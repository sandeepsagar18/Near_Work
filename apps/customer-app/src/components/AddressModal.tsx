import React, { useState } from 'react';
import { X, MapPin, Plus, Check, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiClient } from '../services/api';
import { detectCurrentLocation, getDeviceCoordinates } from '../services/location';

export const AddressModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { user, selectedAddress, setSelectedAddress, refreshProfile } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [label, setLabel] = useState('Home');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Gorakhpur');
  const [state, setState] = useState('Uttar Pradesh');
  const [pincode, setPincode] = useState('273001');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationError, setLocationError] = useState('');

  if (!isOpen) return null;

  const handleSelect = (addr: any) => {
    setSelectedAddress(addr);
    onClose();
  };

  const handleUseLiveGPS = async () => {
    setIsDetecting(true);
    setLocationError('');

    try {
      const loc = await detectCurrentLocation();

      let savedAddress = null;
      if (user) {
        try {
          const res = await ApiClient.request('/customer/addresses', {
            method: 'POST',
            body: JSON.stringify({
              label: 'Live GPS Location',
              addressLine: loc.addressLine,
              landmark: `GPS Accuracy ~${loc.accuracyMeters}m`,
              city: loc.city,
              state: loc.state,
              pincode: loc.pincode,
              latitude: loc.latitude,
              longitude: loc.longitude,
              isDefault: true
            })
          });
          if (res.success && res.data) {
            savedAddress = res.data;
            await refreshProfile();
          }
        } catch (saveErr) {
          console.warn('Could not save GPS address to DB, using local state:', saveErr);
        }
      }

      const activeAddr = savedAddress || {
        id: 'gps-live',
        label: 'Live GPS Location',
        addressLine: loc.addressLine,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        latitude: loc.latitude,
        longitude: loc.longitude
      };

      setSelectedAddress(activeAddr);
      onClose();
    } catch (err: any) {
      setLocationError(err.message || 'Failed to detect location.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let lat = 26.7286785;
      let lng = 83.4367535;

      try {
        const coords = await getDeviceCoordinates();
        lat = coords.latitude;
        lng = coords.longitude;
      } catch (geoErr) {
        // Fallback
      }

      const res = await ApiClient.request('/customer/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label,
          addressLine,
          landmark,
          city,
          state,
          pincode,
          latitude: lat,
          longitude: lng,
          isDefault: true
        })
      });

      if (res.success && res.data) {
        setSelectedAddress(res.data);
        await refreshProfile();
        setShowAddForm(false);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <h3 className="font-bold text-base text-gray-900 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-indigo-600" />
            {showAddForm ? 'Add New Address' : 'Select Delivery & Service Location'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!showAddForm ? (
          <div className="space-y-3">
            {/* Quick 1-Click Detect GPS Location Card */}
            <div
              onClick={handleUseLiveGPS}
              className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/70 hover:bg-indigo-50 transition-all cursor-pointer flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/30">
                  {isDetecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Navigation className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-black text-indigo-900 block">Use Current Device GPS Location</span>
                  <p className="text-[11px] text-indigo-700">Auto-detect your live coordinates & address</p>
                </div>
              </div>

              <span className="text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-indigo-100 flex-shrink-0">
                {isDetecting ? 'Detecting...' : 'Detect'}
              </span>
            </div>

            {locationError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>{locationError}</span>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {user?.addresses && user.addresses.length > 0 ? (
                user.addresses.map((addr: any) => {
                  const isSelected = selectedAddress?.id === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => handleSelect(addr)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10'
                          : 'border-gray-200 hover:border-indigo-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                          {addr.label}
                        </span>
                        <p className="text-sm font-semibold text-gray-900">{addr.addressLine}</p>
                        <p className="text-xs text-gray-500">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-gray-500">
                  No other saved addresses. Click "Detect" above to use live GPS!
                </div>
              )}
            </div>

            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 bg-gray-50 hover:bg-indigo-50 text-indigo-600 font-bold text-xs rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Address Manually</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleAddAddress} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {['Home', 'Office', 'Other'].map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setLabel(l)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    label === l
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">House / Flat / Street Address</label>
              <input
                type="text"
                required
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="e.g. Flat 402, Royal Palms, Civil Lines"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Landmark</label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near City Mall"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Pincode</label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="273001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">State</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save & Select Address'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
