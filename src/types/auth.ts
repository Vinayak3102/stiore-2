export interface CourierAddress {
  streetAddress: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  mobile: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  courierAddress?: CourierAddress;
  createdAt: string;
  updatedAt?: string;
}
