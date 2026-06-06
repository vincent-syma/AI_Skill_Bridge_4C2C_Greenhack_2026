import { Suspense } from "react";
import { ProjectsPage } from "@/features/projects/projects-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="card dim" style={{ padding: 24 }}>Loading projects…</div>}>
      <ProjectsPage />
    </Suspense>
  );
}
