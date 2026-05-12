import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { receivingApi } from "../api/receiving.api";
import { ReceivingFilters } from "../types";
import { toast } from "sonner";

export const useReceivingSlips = (filters: ReceivingFilters) => {
  return useQuery({
    queryKey: ["receiving-slips", filters],
    queryFn: () => receivingApi.getSlips(filters),
  });
};

export const useReceivingSlip = (id: string) => {
  return useQuery({
    queryKey: ["receiving-slip", id],
    queryFn: () => receivingApi.getSlipById(id),
    enabled: !!id,
  });
};

export const useCreateReceivingSlip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => receivingApi.createSlip(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receiving-slips"] });
      toast.success("Tạo phiếu nhập kho thành công");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể tạo phiếu nhập kho");
    }
  });
};

export const useUpdateSlipStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      receivingApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["receiving-slips"] });
      queryClient.invalidateQueries({ queryKey: ["receiving-slip", variables.id] });
      toast.success("Cập nhật trạng thái thành công");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể cập nhật trạng thái");
    }
  });
};
