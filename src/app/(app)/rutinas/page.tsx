import { RutinasView } from "@/components/rutinas-view";

export const dynamic = "force-dynamic";

export default async function RutinasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initial = typeof sp.r === "string" ? sp.r : null;
  return <RutinasView initialRoutine={initial} />;
}
