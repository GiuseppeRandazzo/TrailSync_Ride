import { Booking, Tour, Waypoint } from '../types';

// Fallback configuration for different dev environments:
// - Physical device with Expo Go: set EXPO_PUBLIC_API_URL to your machine's LAN IP (e.g. http://192.168.1.150:8000)
// - Android Emulator: http://10.0.2.2:8000
// - iOS Simulator / Web: http://localhost:8000
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export class OutdooraApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public setBaseUrl(newUrl: string) {
    this.baseUrl = newUrl.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Redeems a booking code (e.g. OUT-1234) and activates the tour ride.
   * Returns full tour polyline, waypoints with AI narration, and assigned partner shop.
   */
  async activateBooking(
    bookingCode: string
  ): Promise<{ message: string; booking: Booking }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bookings/activate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ booking_code: bookingCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.detail ||
            `Errore attivazione (${response.status}): ${JSON.stringify(data)}`
        );
      }

      return data;
    } catch (err: any) {
      // If network fails (e.g. Django server not reachable or demo offline mode)
      if (
        err.message?.includes('Network request failed') ||
        err.message?.includes('Failed to fetch')
      ) {
        throw new Error(
          `Impossibile connettersi al server Django a ${this.baseUrl}. Assicurati che 'python manage.py runserver' sia attivo e che l'IP sia accessibile dal tuo dispositivo.`
        );
      }
      throw err;
    }
  }

  /**
   * Fetches full tour details by ID.
   */
  async fetchTour(tourId: number): Promise<Tour> {
    const response = await fetch(`${this.baseUrl}/api/tours/${tourId}/`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Errore caricamento tour #${tourId}`);
    }
    return await response.json();
  }

  /**
   * Triggers on-demand AI tour guide narration generation for all waypoints.
   */
  async generateAIGuide(
    tourId: number,
    forceMock: boolean = true
  ): Promise<{ message: string; waypoints: Waypoint[] }> {
    const response = await fetch(
      `${this.baseUrl}/api/tours/${tourId}/generate-guide/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_mock: forceMock }),
      }
    );
    if (!response.ok) {
      throw new Error('Errore durante la generazione della guida AI');
    }
    return await response.json();
  }

  /**
   * Marks a booking as completed once the cyclist finishes the ride.
   */
  async completeBooking(
    bookingId: number
  ): Promise<{ message: string; status: string }> {
    const response = await fetch(
      `${this.baseUrl}/api/bookings/${bookingId}/complete/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    if (!response.ok) {
      throw new Error('Errore completamento prenotazione');
    }
    return await response.json();
  }
}

export const api = new OutdooraApiClient();
