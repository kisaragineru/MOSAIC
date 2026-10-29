import { removeAvatarAction } from "@/app/actions/avatar";
import { Avatar } from "@/components/avatar";
import { AvatarEditor } from "@/components/avatar-editor";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { Card } from "@/components/ui";
import { Page } from "@/components/page";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/server/auth/session";
import { getAccount } from "@/server/services/account";
import { myAvatarUrl } from "@/server/services/avatars";
import { getTuvi } from "@/server/services/tuvi";
import { typeInsight } from "@/server/services/tuvi-type";
import { allTypes } from "@/lib/tuvi/type-view";
import { myTint } from "@/server/services/card";

/** Set, crop, change or remove your profile photo. */
export default async function PhotoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const uid = await requireUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const ta = t.avatar;
  const name = (await getAccount(uid)).profile.displayName;
  const src = await myAvatarUrl(uid);
  // The type illustrations, mine first: the owner crops one into their picture if they like.
  const types = allTypes(locale).map((x) => ({ id: x.id, label: x.persona }));
  const insight = await typeInsight(uid, (await getTuvi(uid, locale)).chart ?? null);
  const mineIds: string[] = insight.types.length ? insight.types : insight.selfTypes;
  const mine = types.filter((x) => mineIds.includes(x.id));
  return (
    <Page title={ta.title} back="/me">
      <Flash t={t} sp={sp} />
      <Card>
        <div className="mb-5 flex flex-col items-center gap-3">
          <Avatar name={name} src={src} type={await myTint(uid)} className="h-32 w-32 text-5xl ring-4 ring-white shadow-md" />
          <p className="font-semibold text-stone-900">{name}</p>
        </div>
        <AvatarEditor
          hasPhoto={!!src}
          mine={mine}
          all={types}
          text={{ choose: ta.choose, change: ta.change, help: ta.help, zoom: ta.zoom, rotate: ta.rotate, save: ta.save, saving: ta.saving, cancel: ta.cancel, area: ta.area, failed: ta.failed, fromType: ta.fromType, fromTypeHelp: ta.fromTypeHelp, yourType: ta.yourType, otherTypes: ta.otherTypes, errors: t.errors as Record<string, string> }}
        />
        {src && (
          <form action={removeAvatarAction} className="mt-3">
            <ConfirmButton quiet message={ta.removeConfirm} className="w-full">{ta.remove}</ConfirmButton>
          </form>
        )}
        <p className="mt-4 text-xs leading-5 text-stone-500">🔒 {ta.who}</p>
      </Card>
    </Page>
  );
}
