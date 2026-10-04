export enum BillType {
  Electric = 'electric',
  Water = 'water',
  Internet = 'internet',
  Gas = 'gas',
  PropertyTax = 'property_tax',
  BuildingFee = 'building_fee',
  Cellular = 'cellular',
  Rent = 'rent',
  HealthCare = 'health_care',
}

export type BillPeriod = 1 | 2 | 3 | 4 | 5 | 6;

export interface ElectricBillData {
  usage: number;
  period: BillPeriod;
  year: number;
}

export interface WaterBillData {
  usage: number;
  period: BillPeriod;
  year: number;
}

export interface InternetBillData {}

export interface GasBillData {}

export interface PropertyTaxData {
  year: number;
}

export interface BuildingFeeData {}

export interface CellularBillData {}

export interface RentBillData {}

export interface HealthCareBillData {}

export type BillData = ElectricBillData | WaterBillData | InternetBillData | GasBillData | PropertyTaxData | BuildingFeeData | CellularBillData | RentBillData | HealthCareBillData;

export interface Bill {
  id: string;
  created: Date;
  modified: Date;
  /** 0 = active, 1 = deleted */
  state: number;
  type: BillType;
  start_date: Date;
  end_date: Date;
  price: number;
  data: BillData;
  provider_id: string | null;
  residence_id: string | null;
  resident_id: string | null;
  contract_id: string | null;
  comment: string | null;
}
