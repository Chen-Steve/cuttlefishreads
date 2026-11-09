import { PageContainer } from "@/components/page-container";
import { getAdminAccess } from "@/lib/access";
import { getWorkspaceNovels } from "@/lib/data/workspace";
import { WORKSPACE_BASE, WORKSPACE_LABELS } from "@/lib/workspace";
import { NovelsGrid } from "../_components/novels-grid";

export async function WorkspaceNovelsPage() {
  const access = await getAdminAccess();
  const base = WORKSPACE_BASE;
  const labels = WORKSPACE_LABELS;
  const { novels, translatorOptions } = access
    ? await getWorkspaceNovels(access)
    : { novels: [], translatorOptions: [] };

  return (
    <PageContainer as="div">
      <p className="mb-4 text-center text-xs text-muted sm:hidden">
        This workspace is best viewed on a desktop screen.
      </p>

      <NovelsGrid
        novels={novels}
        translatorOptions={translatorOptions}
        title={labels.novels}
        createHref={`${base}/novels/new`}
        createLabel={`Create ${labels.noun}`}
      />
    </PageContainer>
  );
}
