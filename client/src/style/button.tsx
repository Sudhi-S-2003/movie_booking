import { cn } from "../utils/cn";

export const buttonStyleNormal = (isActive: boolean) =>
  cn(
    "px-4 py-2 bg-slate-500 text-white cursor-pointer rounded capitalize",
    isActive && "bg-blue-500"
  );
