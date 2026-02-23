export interface Business {
  id: string;
  ownerUserId: string;
  name: string;
  locationName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  fullName: string;
  active: boolean;
  startDate?: string | null;
  terminationDate?: string | null;
  userId: string;
  businessId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Cell {
  id: string;
  monthPlanId: string;
  employeeId: string;
  day: number;
  value: string;
}

export interface MonthPlan {
  id: string;
  month: number;
  year: number;
  locationName: string;
  userId: string;
  businessId?: string | null;
  employeeIds: string; // JSON string
  cells: Cell[];
  createdAt: string;
  updatedAt: string;
}

// Known cell values; custom numeric hour strings (e.g. '8', '10') are also valid.
export type CellValue = string;
