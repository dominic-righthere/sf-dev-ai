"use client";

import type { ParsedComponentNode } from "@/lib/flexipage/types";
import { getComponent } from "./index";

export function ComponentRenderer({ node }: { node: ParsedComponentNode }) {
  const Comp = getComponent(node.type);
  return <Comp component={node} />;
}

export function RenderChildren({ children }: { children: ParsedComponentNode[] }) {
  if (!children || children.length === 0) return null;
  return (
    <>
      {children.map((child) => (
        <ComponentRenderer key={child.id} node={child} />
      ))}
    </>
  );
}
