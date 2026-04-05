
export type LoginPayload = {
  userId: string;
  pin: string;
};

export type CreateUserPayload = {
  name: string;
  role: 'owner' | 'staff';
  pin: string;
};

export type UpdateOwnProfilePayload = {
  name?: string;
  pin?: string;
};