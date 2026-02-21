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

export type CellValue = '' | '24' | 'CO' | 'CM' | 'X' | 'D' | 'E' | 'M' | 'I' | 'S';
