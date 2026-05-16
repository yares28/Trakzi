import { useMutation, useQueryClient } from "@tanstack/react-query"

export function useDeleteFeature() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (featureId: string): Promise<void> => {
      const res = await fetch(`/api/feedback/features/${featureId}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete feature")
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback-features"] })
    },
  })
}
