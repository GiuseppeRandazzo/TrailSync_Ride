import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Booking, Tour, Waypoint, RiderLocation, PartnerShop } from '../types';
import { api } from '../services/api';
import { findNearbyWaypoint } from '../utils/distance';
import { DEMO_BOOKING } from '../services/demoData';

interface TourContextType {
  booking: Booking | null;
  tour: Tour | null;
  partner: PartnerShop | null;
  riderLocation: RiderLocation | null;
  selectedPOI: Waypoint | null;
  visitedPOIIds: number[];
  nearbyAlertPOI: Waypoint | null;
  isLoading: boolean;
  error: string | null;
  isSimulating: boolean;
  simulationSpeed: number;
  simulationIndex: number;
  progressPercentage: number;
  activateBooking: (code: string) => Promise<boolean>;
  loadDemoOfflineTour: () => void;
  selectPOI: (poi: Waypoint | null) => void;
  dismissNearbyAlert: () => void;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  setSpeed: (speed: number) => void;
  completeTour: () => Promise<void>;
  exitTour: () => void;
  setApiBaseUrl: (url: string) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<Waypoint | null>(null);
  const [visitedPOIIds, setVisitedPOIIds] = useState<number[]>([]);
  const [nearbyAlertPOI, setNearbyAlertPOI] = useState<Waypoint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [simulationIndex, setSimulationIndex] = useState<number>(0);
  const simulationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tour: Tour | null = booking?.tour || null;
  const partner: PartnerShop | null = booking?.partner_shop || null;

  // Total points in polyline
  const totalPoints = tour?.polyline?.length || 0;
  const progressPercentage = totalPoints > 0 ? Math.min(100, Math.round((simulationIndex / (totalPoints - 1)) * 100)) : 0;

  // Initialize rider position when tour loads
  useEffect(() => {
    if (tour?.polyline && tour.polyline.length > 0 && !riderLocation) {
      const startPt = tour.polyline[0];
      setRiderLocation({
        latitude: startPt.latitude,
        longitude: startPt.longitude,
        altitude: startPt.elevation,
        speed: 0,
      });
      setSimulationIndex(0);
    }
  }, [tour]);

  // Simulation step runner
  useEffect(() => {
    if (!isSimulating || !tour?.polyline || tour.polyline.length === 0) {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      return;
    }

    const intervalMs = Math.max(200, 1200 / simulationSpeed);

    simulationTimerRef.current = setInterval(() => {
      setSimulationIndex((prevIdx) => {
        const nextIdx = prevIdx + 1;
        if (nextIdx >= tour.polyline.length) {
          setIsSimulating(false);
          return prevIdx;
        }

        const nextPoint = tour.polyline[nextIdx];
        const newLocation: RiderLocation = {
          latitude: nextPoint.latitude,
          longitude: nextPoint.longitude,
          altitude: nextPoint.elevation,
          speed: Math.round(18 + (Math.random() * 4 - 2)), // approx 18 km/h
        };
        setRiderLocation(newLocation);

        // Check proximity to any waypoint along route
        const nearby = findNearbyWaypoint(newLocation, tour.waypoints, 70);
        if (nearby) {
          setNearbyAlertPOI(nearby);
          setVisitedPOIIds((prev) => (prev.includes(nearby.id) ? prev : [...prev, nearby.id]));
        }

        return nextIdx;
      });
    }, intervalMs);

    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, [isSimulating, simulationSpeed, tour]);

  const activateBooking = async (code: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.activateBooking(code);
      setBooking(result.booking);
      if (result.booking.tour?.polyline?.length) {
        const first = result.booking.tour.polyline[0];
        setRiderLocation({
          latitude: first.latitude,
          longitude: first.longitude,
          altitude: first.elevation,
          speed: 0,
        });
        setSimulationIndex(0);
      }
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Errore durante il riscatto della prenotazione.');
      setIsLoading(false);
      return false;
    }
  };

  const loadDemoOfflineTour = () => {
    setIsLoading(false);
    setError(null);
    setBooking(DEMO_BOOKING);
    if (DEMO_BOOKING.tour.polyline.length) {
      const first = DEMO_BOOKING.tour.polyline[0];
      setRiderLocation({
        latitude: first.latitude,
        longitude: first.longitude,
        altitude: first.elevation,
        speed: 0,
      });
      setSimulationIndex(0);
    }
  };

  const selectPOI = (poi: Waypoint | null) => {
    setSelectedPOI(poi);
    if (poi && !visitedPOIIds.includes(poi.id)) {
      setVisitedPOIIds((prev) => [...prev, poi.id]);
    }
  };

  const dismissNearbyAlert = () => {
    setNearbyAlertPOI(null);
  };

  const startSimulation = () => {
    if (tour?.polyline && simulationIndex >= tour.polyline.length - 1) {
      setSimulationIndex(0);
    }
    setIsSimulating(true);
  };

  const pauseSimulation = () => {
    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setSimulationIndex(0);
    if (tour?.polyline?.length) {
      const first = tour.polyline[0];
      setRiderLocation({
        latitude: first.latitude,
        longitude: first.longitude,
        altitude: first.elevation,
        speed: 0,
      });
    }
    setNearbyAlertPOI(null);
  };

  const setSpeed = (speed: number) => {
    setSimulationSpeed(speed);
  };

  const completeTour = async () => {
    if (!booking) return;
    try {
      await api.completeBooking(booking.id);
      setBooking((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
      setIsSimulating(false);
    } catch (err: any) {
      console.warn('Error completing tour:', err);
    }
  };

  const exitTour = () => {
    setIsSimulating(false);
    setBooking(null);
    setRiderLocation(null);
    setSelectedPOI(null);
    setNearbyAlertPOI(null);
    setVisitedPOIIds([]);
    setSimulationIndex(0);
  };

  const setApiBaseUrl = (url: string) => {
    api.setBaseUrl(url);
  };

  return (
    <TourContext.Provider
      value={{
        booking,
        tour,
        partner,
        riderLocation,
        selectedPOI,
        visitedPOIIds,
        nearbyAlertPOI,
        isLoading,
        error,
        isSimulating,
        simulationSpeed,
        simulationIndex,
        progressPercentage,
        activateBooking,
        loadDemoOfflineTour,
        selectPOI,
        dismissNearbyAlert,
        startSimulation,
        pauseSimulation,
        resetSimulation,
        setSpeed,
        completeTour,
        exitTour,
        setApiBaseUrl,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = (): TourContextType => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};
