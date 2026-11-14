export interface CourierAddress {
  streetAddress: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  email: string;
  courierAddress?: CourierAddress;
  createdAt: string;
}

export interface RegisteredAccount {
  profile: UserProfile;
  password: string; // Stored securely in client storage
}
