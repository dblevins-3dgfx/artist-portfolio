export type OriginalStatus = "in-studio" | "sold" | "not-for-sale";

export type Work = {
  slug: string;
  title: string;
  year: number;
  medium: string;
  surface: string;
  widthIn: number;
  heightIn: number;
  statement: string;
  featured: boolean;
  originalStatus: OriginalStatus;
  printsAvailable: boolean;
  sample: boolean;
  image: string;
  imageWidth: number;
  imageHeight: number;
};

export type RequestStatus = "new" | "confirmed" | "shipped" | "closed";

export type RequestItem = {
  slug: string;
  title: string;
  sizeId: string;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
};

export type PrintRequest = {
  id: string;
  createdAt: string;
  status: RequestStatus;
  buyer: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    region: string;
    postal: string;
    country: string;
    notes: string;
  };
  items: RequestItem[];
  total: number;
};
