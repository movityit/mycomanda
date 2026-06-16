import { getAuthToken } from "@/lib/auth";
import { RootPage } from "@/components/comanda/root-page";

export default async function Page() {
    const token = await getAuthToken();

    return <RootPage authenticated={!!token} />;
}
