import { notFound } from "next/navigation";
import { FaceSetter } from "@/components/face-setter";
import { Card, Page } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { TYPE_FACES } from "@/lib/tuvi/faces";
import { allTypes } from "@/lib/tuvi/type-view";
import { requireUser } from "@/server/auth/session";
import { devToolsFor } from "@/server/services/admin";

/** Development only: where the faces are in the type illustrations (for one-tap pictures). */
export default async function FacesPage() {
  const uid = await requireUser();
  if (!(await devToolsFor(uid))) notFound();
  const { locale } = await getT();
  return (
    <Page title="タイプの顔の切り抜き" back="/admin#dev">
      <Card>
        <FaceSetter types={allTypes(locale).map((x) => ({ id: x.id, label: x.persona }))} initial={TYPE_FACES as Record<string, Record<string, { cx: number; cy: number; r: number }>>} />
      </Card>
    </Page>
  );
}
