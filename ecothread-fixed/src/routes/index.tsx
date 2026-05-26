import { createFileRoute } from "@tanstack/react-router";
import { FactoryManagerView } from "@/components/FactoryManagerView";

export const Route = createFileRoute("/")({
  component: FactoryManagerView,
});
