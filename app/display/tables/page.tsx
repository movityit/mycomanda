import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import { TablesDisplay } from "@/components/display/tables-display";

export default async function Page() {
    const token = await getAuthToken();
    if (!token) redirect("/?error=session_expired");

    if (process.env.REQUIRE_TABLE !== "true") redirect("/display");

    return <TablesDisplay />;
}
