/** Shipping rate quote */
export interface ShippingRate {
  id: string;
  name: string;
  price: number;
  currency: string;
  estimatedDays?: number;
  carrier?: string;
}

/** Address for rate calculation */
export interface ShippingAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  state?: string;
  country: string;
}

/** Parcel dimensions/weight */
export interface ShippingParcel {
  weight: number;
  weightUnit: 'kg' | 'lb';
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: 'cm' | 'in';
}

/** Tracking info returned after creating a shipment */
export interface ShippingLabel {
  trackingNumber: string;
  carrier: string;
  labelUrl?: string;
  trackingUrl?: string;
}

/** Tracking status update */
export interface ShippingTrackingStatus {
  status: 'pending' | 'in_transit' | 'delivered' | 'failed' | 'returned';
  location?: string;
  timestamp: Date;
  description?: string;
}

/** Shipping provider interface for plugins */
export interface ShippingProviderMethods {
  /** Initialize with settings */
  initialize(settings: Record<string, unknown>): Promise<void>;
  /** Calculate shipping rates */
  getRates(
    from: ShippingAddress,
    to: ShippingAddress,
    parcels: ShippingParcel[],
  ): Promise<ShippingRate[]>;
  /** Create a shipment and get label */
  createShipment(
    from: ShippingAddress,
    to: ShippingAddress,
    parcels: ShippingParcel[],
    rateId: string,
  ): Promise<ShippingLabel>;
  /** Get tracking status */
  getTracking(trackingNumber: string): Promise<ShippingTrackingStatus[]>;
}
