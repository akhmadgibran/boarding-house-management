export type AssetMaster = {
  id: string;
  name: string;
  _count: {
    assets: number;
  };
};

export type GetAllAssetMastersResponse = {
  assetMasters: AssetMaster[];
};

export type CreateAssetMasterPayload = {
  name: string;
};

export type AssetMasterMutationResponse = {
  message: string;
  assetMaster: {
    id: string;
    name: string;
  };
};

export type DeleteAssetMasterResponse = {
  message: string;
};
