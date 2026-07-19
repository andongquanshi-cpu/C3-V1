import { CreationWorkbench } from "@/components/workspace/CreationWorkbench";
import { normalizeBusinessLine } from "@/lib/business-line";

interface CreatePageProps {
  searchParams: Promise<{ businessLine?: string | string[] }>;
}

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const params = await searchParams;
  const rawBusinessLine = Array.isArray(params.businessLine) ? params.businessLine[0] : params.businessLine;
  const businessLine = normalizeBusinessLine(rawBusinessLine ?? "licaitong");

  return <CreationWorkbench businessLine={businessLine} />;
}
