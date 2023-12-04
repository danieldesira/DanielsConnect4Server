export interface AuthenticatedUser extends UserDBModel {
  fullName: string;
  picUrl: string;
}

export interface UserDBModel {
  id: number;
}
