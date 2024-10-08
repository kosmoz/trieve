import {
  Accessor,
  Context,
  createContext,
  createEffect,
  createSignal,
  on,
  ParentComponent,
  Show,
  useContext,
} from "solid-js";
import { OrgContext } from "../contexts/OrgContext";
import { createQuery } from "@tanstack/solid-query";
import { apiHost } from "../utils/apiHost";
import { redirect, useSearchParams } from "@solidjs/router";
import { DatasetAndUsage } from "shared/types";
import { Sidebar } from "../components/Sidebar";
import { NoDatasetsErrorPage } from "../pages/errors/NoDatasetsErrorPage";

type DatasetContextType = Accessor<DatasetAndUsage>;

export const DatasetContext =
  createContext<DatasetContextType>() as Context<DatasetContextType>;

export const TopBarLayout: ParentComponent = (props) => {
  const [params, setParams] = useSearchParams();
  const org = useContext(OrgContext);

  const datasetsQuery = createQuery(() => ({
    queryKey: ["datasets", org.selectedOrg().id],
    queryFn: async () => {
      const repsonse = await fetch(
        `${apiHost}/dataset/organization/${org.selectedOrg().id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "TR-Organization": org.selectedOrg().id,
          },
          credentials: "include",
        },
      );

      if (repsonse.status === 401) {
        throw redirect(
          `${apiHost}/auth?redirect_uri=${window.origin}/dashboard/foo`,
        );
      }
      const datasets = (await repsonse.json()) as unknown as DatasetAndUsage[];
      return datasets;
    },
    initialData: [],
  }));

  const [selectedDataset, setSelectedDataset] =
    createSignal<DatasetAndUsage | null>(null);

  createEffect(
    on(
      () => datasetsQuery.data,
      () => {
        if (params.dataset) {
          setSelectedDataset(
            datasetsQuery.data?.find((d) => d.dataset.id === params.dataset) ||
              datasetsQuery.data?.at(0) ||
              null,
          );
        } else {
          setSelectedDataset(datasetsQuery.data?.at(0) || null);
        }
      },
    ),
  );

  const proxySetSelectedDataset = (dataset: DatasetAndUsage) => {
    setSelectedDataset(dataset);
    setParams({ dataset: dataset.dataset.id });
  };

  return (
    <div class="grid h-screen min-h-screen grid-rows-1 overflow-hidden bg-white lg:grid-cols-[300px_1fr]">
      <Sidebar
        datasetOptions={datasetsQuery.data || []}
        selectedDataset={selectedDataset()}
        setSelectedDataset={proxySetSelectedDataset}
      />
      <div>
        <Show
          when={
            datasetsQuery.status === "success" &&
            datasetsQuery.data?.length === 0 &&
            datasetsQuery.isFetchedAfterMount
          }
        >
          <NoDatasetsErrorPage orgId={org.selectedOrg().id} />
        </Show>
        <Show when={selectedDataset()}>
          <DatasetContext.Provider
            value={selectedDataset as Accessor<DatasetAndUsage>}
          >
            <div class="h-full overflow-auto">
              <div class="min-h-screen p-4">{props.children}</div>
            </div>
          </DatasetContext.Provider>
        </Show>
      </div>
    </div>
  );
};
