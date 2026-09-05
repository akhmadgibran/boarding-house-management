export type RoomStatus = "OCCUPIED" | "VACANT";
export type AssetStatus = "BROKEN" | "GOOD" | "MAINTENANCE";
export type MaintenanceStatus = "PROCESS" | "PENDING" | "FINISHED";
export type PaymentStatus = "PAID" | "UNPAID" | "NOT_FULLY_PAID";
export type PaymentMethod = "TRANSFER" | "QRIS" | "E_WALLET" | "CASH";

export type RoomAssetMasterRef = {
  id: string;
  name: string;
};

export type RoomAsset = {
  id: string;
  assetMasterId: string;
  roomId: string;
  name: string;
  details: string;
  status: AssetStatus;
  assetMaster: RoomAssetMasterRef;
};

export type RoomListItem = {
  id: string;
  name: string;
  price: number;
  status: RoomStatus;
  activeOccupant?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  assets: RoomAsset[];
  _count: {
    payments: number;
    invoices: number;
  };
};

export type RoomAssetMaintenanceLog = {
  id: string;
  assetId: string;
  details: string;
  status: MaintenanceStatus;
};

export type RoomDetailAsset = RoomAsset & {
  maintenanceLog: RoomAssetMaintenanceLog[];
};

export type RoomPayment = {
  id: string;
  paidDate: string | null;
  priceApplied: number;
  paidNominal: number;
  periodStart: string;
  periodEnd: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  occupant: {
    email: string;
    occupantDetails: {
      name: string;
    } | null;
  };
};

export type RoomDetail = {
  id: string;
  name: string;
  price: number;
  status: RoomStatus;
  assets: RoomDetailAsset[];
  payments: RoomPayment[];
};

export type GetAllRoomsResponse = {
  rooms: RoomListItem[];
};

export type GetRoomDetailResponse = {
  room: RoomDetail;
};

export type CreateRoomAssetInput = {
  assetMasterId: string;
  name: string;
  details: string;
};

export type CreateRoomPayload = {
  name: string;
  price: number;
  assets?: CreateRoomAssetInput[];
};

export type UpdateRoomPayload = {
  name?: string;
  price?: number;
  status?: RoomStatus;
  assets?: {
    id?: string;
    assetMasterId: string;
    name: string;
    details: string;
  }[];
};

export type RoomMutationResponse = {
  message: string;
  room: {
    id: string;
    name: string;
    price: number;
    status: RoomStatus;
    assets: RoomAsset[];
  };
};

export type DeleteRoomResponse = {
  message: string;
};
