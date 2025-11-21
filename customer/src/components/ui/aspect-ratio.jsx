"use client";

import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

export function AspectRatio(props) {
  return (
    <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />
  );
}
