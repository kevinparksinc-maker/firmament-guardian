import { trpc } from "@/lib/trpc";

export function useAuth() {
  const query = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate();
    },
  });

  return {
    user: query.data ?? null,
    loading: query.isLoading,
    logout: () => logoutMutation.mutate(),
  };
}
