import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuContent = React.forwardRef(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Content
        ref={ref}
        className={`z-50 min-w-[8rem] overflow-hidden rounded-md border border-slate-700 bg-slate-800 p-1 text-white shadow-md ${className}`}
        {...props}
    />
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef(
    ({ className, ...props }, ref) => (
        <DropdownMenuPrimitive.Item
            ref={ref}
            className={`cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-700 ${className}`}
            {...props}
        />
    )
);


DropdownMenuItem.displayName = "DropdownMenuItem";
