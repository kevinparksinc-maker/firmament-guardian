import { LogIn, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";

export function AccountControl() {
  const me = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => me.refetch() });

  if (me.data) {
    return <div className="flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-100/[0.06] pl-3 pr-1.5 py-1"><UserRound className="h-3.5 w-3.5 text-cyan-200"/><span className="max-w-28 truncate text-xs text-cyan-100">{me.data.name || "My observatory"}</span><Button type="button" variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending} className="h-7 rounded-full px-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Sign out"><LogOut className="h-3.5 w-3.5"/></Button></div>;
  }

  return <Button type="button" variant="outline" onClick={startLogin} className="h-9 rounded-full border-cyan-200/30 bg-cyan-100/10 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-100/20"><LogIn className="mr-2 h-3.5 w-3.5"/>Save your observatory</Button>;
}
