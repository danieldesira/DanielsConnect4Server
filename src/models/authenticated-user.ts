import { BoardDimensions } from "@danieldesira/daniels-connect4-common";

export interface AuthenticatedUser extends UserDBModel {
    fullName: string;
    picUrl: string;
    isTokenValid: boolean;
}

export interface UserDBModel {
    id: number;
    dimensions: BoardDimensions;
}