import { Suspense } from "react";
import { CoachLab } from "@/components/layout/CoachLab";
import { LabUrlSync } from "@/components/lab/LabUrlSync";

export default function LabPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense fallback={null}>
        <LabUrlSync />
      </Suspense>
      <CoachLab />
    </div>
  );
}
