
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

export type SetupUpdateUserPayload = {
  name?: string;
  pin?: string;
  role?: 'owner' | 'staff';
};

export type ManagedUser = {
  id: string;
  name: string;
  role: 'owner' | 'staff';
  isActive: boolean;
};