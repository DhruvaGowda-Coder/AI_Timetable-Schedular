"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, PlusCircle, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Workspace } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};path=/;expires=${d.toUTCString()};SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT;SameSite=Lax`;
}

export function WorkspaceSwitcher() {
  const { data: session } = useSession();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    const fetchWorkspaces = async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (!res.ok) return;
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
      } catch (err) {
        console.error("Failed to load workspaces", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
    
    // Read the active workspace from cookie
    const currentCookie = getCookie("schedulr_workspace_id");
    setActiveWorkspaceId(currentCookie ?? session.user.id);
  }, [session?.user?.id]);

  if (!session?.user?.id) return null;

  if (loading) {
    return <Skeleton className="h-9 w-[160px] rounded-md border border-white/10 bg-white/5" />;
  }

  const isPersonal = activeWorkspaceId === session.user.id;
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const activeLabel = isPersonal ? "Personal Workspace" : activeWorkspace?.name ?? "Personal Workspace";

  const handleSwitch = (id: string) => {
    if (id === session.user?.id) {
      deleteCookie("schedulr_workspace_id");
    } else {
      setCookie("schedulr_workspace_id", id);
    }
    setActiveWorkspaceId(id);
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-[100px] sm:w-[160px] max-w-[160px] justify-between truncate rounded-md border-white/10 bg-white/5 px-2 sm:px-3 text-xs sm:text-sm backdrop-blur-sm transition-all hover:bg-white/10"
        >
          <span className="truncate">{activeLabel}</span>
          <ChevronsUpDown className="ml-1 sm:ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] border-white/10 bg-card">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              if (session?.user?.id) handleSwitch(session.user.id);
            }}
            className="flex cursor-pointer items-center justify-between"
          >
            <span className="truncate">Personal Workspace</span>
            {isPersonal && <Check className="h-4 w-4 shrink-0" />}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        {workspaces.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuGroup>
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => handleSwitch(ws.id)}
                  className="flex cursor-pointer items-center justify-between"
                >
                  <span className="truncate">{ws.name}</span>
                  {activeWorkspaceId === ws.id && <Check className="h-4 w-4 shrink-0" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
        
        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem
          className="cursor-pointer text-brand-text"
          onClick={() => router.push("/settings/workspace")}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Manage Teams
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


