import { Suspense } from "react";
import { CoachLab } from "@/components/layout/CoachLab";
import { LabUrlSync } from "@/components/lab/LabUrlSync";

export default function LabPage() {
  return (
    <div className="flex min-h-full w-full flex-col lg:h-full lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <Suspense fallback={null}>
        <LabUrlSync />
      </Suspense>
      <CoachLab />
    </div>
  );
}
