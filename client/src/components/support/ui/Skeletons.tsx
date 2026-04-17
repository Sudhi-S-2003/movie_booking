import React from "react";

const MessageSkeleton: React.FC<{ align: "left" | "right"; width: string }> = ({
  align,
  width,
}) => (
  <div className={`flex items-end gap-3 mt-5 ${align === "right" ? "flex-row-reverse" : "flex-row"}`}>
    {}
    <div className="w-8 h-8 rounded-2xl bg-white/[0.05] animate-pulse flex-shrink-0" />
    <div
      className={`flex flex-col ${align === "right" ? "items-end" : "items-start"}`}
      style={{ maxWidth: width }}
    >
      {}
      <div className="h-2 w-16 rounded bg-white/[0.04] mb-2 animate-pulse" />
      {}
      <div
        className={`rounded-[20px] animate-pulse ${
          align === "right"
            ? "bg-accent-blue/10 rounded-br-[6px]"
            : "bg-white/[0.04] rounded-bl-[6px]"
        }`}
        style={{ width, height: 44 }}
      />
      {}
      <div className="h-2 w-10 rounded bg-white/[0.03] mt-2 animate-pulse" />
    </div>
  </div>
);

export const ChatSkeletonScreen = () => (
  <div className="px-6 py-4 space-y-1">
    <MessageSkeleton align="left"  width="200px" />
    <MessageSkeleton align="left"  width="140px" />
    <MessageSkeleton align="right" width="240px" />
    <MessageSkeleton align="right" width="160px" />
    <MessageSkeleton align="left"  width="300px" />
    <MessageSkeleton align="right" width="180px" />
    <MessageSkeleton align="left"  width="220px" />
    <MessageSkeleton align="right" width="130px" />
  </div>
);

const IssueCardSkeleton = () => (
  <div className="w-full p-6 rounded-3xl border border-white/5 bg-white/[0.02] space-y-4 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="h-4 w-16 rounded-full bg-white/[0.06]" />
      <div className="h-3 w-12 rounded bg-white/[0.04]" />
    </div>
    <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
    <div className="flex justify-between items-center">
      <div className="h-3 w-24 rounded bg-white/[0.04]" />
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" />
        <div className="h-3 w-14 rounded bg-white/[0.04]" />
      </div>
    </div>
  </div>
);

export const IssueListSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <IssueCardSkeleton key={i} />
    ))}
  </div>
);
