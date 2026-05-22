"use client";

import { Shield, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { UserAssignment } from "@/lib/salesforce/rbac";

interface AccessComparisonProps {
  users: UserAssignment[];
  compareUserIds: [string | null, string | null];
  onSelectUser: (index: 0 | 1, userId: string) => void;
}

export function AccessComparison({ users, compareUserIds, onSelectUser }: AccessComparisonProps) {
  const userA = users.find((u) => u.userId === compareUserIds[0]);
  const userB = users.find((u) => u.userId === compareUserIds[1]);

  const allPsNames = new Set<string>();
  userA?.permissionSets.forEach((ps) => allPsNames.add(ps.name));
  userB?.permissionSets.forEach((ps) => allPsNames.add(ps.name));

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-default">
        <div className="grid grid-cols-2 gap-4">
          {([0, 1] as const).map((idx) => (
            <select
              key={idx}
              value={compareUserIds[idx] || ""}
              onChange={(e) => onSelectUser(idx, e.target.value)}
              className="rounded-md border border-border-default bg-bg-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            >
              <option value="">Select User {idx + 1}</option>
              {users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.name} ({u.username})
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {userA && userB ? (
          <div className="p-4">
            {/* Profiles */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[userA, userB].map((user) => (
                <div key={user.userId} className="rounded-lg border border-border-default bg-bg-primary p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-3.5 w-3.5 text-text-muted" />
                    <span className="text-xs font-medium text-text-primary">{user.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-amber-400" />
                    <span className="text-xs text-text-secondary">{user.profileName}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Permission Sets comparison */}
            <h4 className="text-xs font-medium text-text-primary mb-2">Permission Sets</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left py-2 pr-4 text-text-muted font-medium">Permission Set</th>
                  <th className="text-center py-2 px-4 text-text-muted font-medium">{userA.name}</th>
                  <th className="text-center py-2 px-4 text-text-muted font-medium">{userB.name}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(allPsNames)
                  .sort()
                  .map((psName) => {
                    const aHas = userA.permissionSets.some((ps) => ps.name === psName);
                    const bHas = userB.permissionSets.some((ps) => ps.name === psName);
                    const diff = aHas !== bHas;
                    return (
                      <tr key={psName} className={diff ? "bg-amber-500/5 border-b border-border-default/50" : "border-b border-border-default/50"}>
                        <td className="py-2 pr-4 text-text-primary">{psName}</td>
                        <td className="text-center py-2 px-4">
                          {aHas ? <span className="text-green-400 font-bold">Y</span> : <span className="text-text-muted">-</span>}
                        </td>
                        <td className="text-center py-2 px-4">
                          {bHas ? <span className="text-green-400 font-bold">Y</span> : <span className="text-text-muted">-</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center text-text-muted text-xs py-12">
            Select two users to compare their access
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
