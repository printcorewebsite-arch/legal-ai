import { create } from "zustand";

type FormData = {
  type?: string;
  name?: string;
  activity?: string;
  address?: string;
  capital?: string;
  director?: string;
};

type CompanyStore = {
  formData: FormData;
  setFormData: (data: FormData) => void;
};

export const useCompanyStore = create<CompanyStore>((set) => ({
  formData: {},
  setFormData: (data) => set({ formData: data }),
}));
